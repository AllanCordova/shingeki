package attack_test

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func testEngine(concurrency int) *attack.RestyEngine {
	return attack.NewRestyEngine(config.AttackConfig{
		Concurrency:    concurrency,
		RequestTimeout: 3 * time.Second,
		RateLimitRPS:   100,
		MaxBodyBytes:   1024,
		UserAgent:      "test-agent",
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func queryJob(rawURL string) types.Job {
	return types.Job{
		Attack: contracts.AttackItem{
			AttackID:       "atk-1",
			Category:       "SQL_INJECTION",
			TargetLocation: "QUERY_PARAMETER",
		},
		Vector: contracts.AttackVector{
			Route:          rawURL,
			Method:         http.MethodGet,
			TargetLocation: "QUERY_PARAMETER",
			Params:         map[string]string{"q": "test"},
			Headers:        map[string]string{"Authorization": "Bearer secret-token"},
		},
		ParamKey: "q",
		Payload:  types.PayloadSpec{Value: "' OR 1=1 --"},
	}
}

func TestExecutePoolRedactsSensitiveHeaders(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}))
	t.Cleanup(server.Close)

	engine := testEngine(2)
	responses := engine.ExecutePool(context.Background(), []types.Job{queryJob(server.URL + "/search?q=test")})
	if len(responses) != 1 {
		t.Fatalf("expected 1 response, got %d", len(responses))
	}
	if responses[0].Error != nil {
		t.Fatalf("unexpected error: %v", responses[0].Error)
	}
	if strings.Contains(responses[0].RawRequest, "secret-token") {
		t.Fatalf("expected redacted authorization, got %s", responses[0].RawRequest)
	}
	if !strings.Contains(responses[0].RawRequest, "Authorization: [REDACTED]") {
		t.Fatalf("expected redacted authorization header, got %s", responses[0].RawRequest)
	}
}

func TestExecutePoolDoesNotFollowCrossOriginRedirect(t *testing.T) {
	t.Parallel()

	var externalHits atomic.Int32
	external := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		externalHits.Add(1)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("external"))
	}))
	t.Cleanup(external.Close)

	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, external.URL+"/leak", http.StatusFound)
	}))
	t.Cleanup(origin.Close)

	engine := testEngine(1)
	responses := engine.ExecutePool(context.Background(), []types.Job{queryJob(origin.URL + "/start")})
	if len(responses) != 1 || responses[0].Error != nil {
		t.Fatalf("unexpected responses: %+v", responses)
	}
	if externalHits.Load() != 0 {
		t.Fatal("expected cross-origin redirect to be blocked")
	}
	if responses[0].AttackStatus != http.StatusFound {
		t.Fatalf("expected 302 from origin, got %d", responses[0].AttackStatus)
	}
}

func TestExecutePoolSkipsJWTOnPublicRoute(t *testing.T) {
	t.Parallel()

	var hits atomic.Int32
	var credentialed atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		if r.Header.Get("Authorization") != "" || r.Header.Get("Cookie") != "" {
			credentialed.Add(1)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("public article"))
	}))
	t.Cleanup(server.Close)

	engine := testEngine(1)
	responses := engine.ExecutePool(context.Background(), []types.Job{jwtJob(server.URL + "/hc/article")})
	if len(responses) != 1 {
		t.Fatalf("expected 1 response, got %d", len(responses))
	}
	if !responses[0].Skipped {
		t.Fatal("expected public route to skip JWT confusion")
	}
	if responses[0].AttackStatus != 0 || responses[0].BaselineStatus != 0 {
		t.Fatalf("expected no attack traffic, baseline=%d attack=%d", responses[0].BaselineStatus, responses[0].AttackStatus)
	}
	if hits.Load() != 1 {
		t.Fatalf("expected only the unauthenticated probe, got %d", hits.Load())
	}
	if credentialed.Load() != 0 {
		t.Fatal("public probe must not send Authorization or Cookie")
	}
}

func TestExecutePoolRunsJWTWhenAnonymousIsRejected(t *testing.T) {
	t.Parallel()

	var anonymous, broken, forged atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		switch {
		case auth == "":
			anonymous.Add(1)
			w.WriteHeader(http.StatusUnauthorized)
		case strings.Contains(auth, "invalid-signature"):
			broken.Add(1)
			w.WriteHeader(http.StatusUnauthorized)
		default:
			forged.Add(1)
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"email":"admin@example.com","role":"admin"}`))
		}
	}))
	t.Cleanup(server.Close)

	engine := testEngine(1)
	responses := engine.ExecutePool(context.Background(), []types.Job{jwtJob(server.URL + "/api/me")})
	if len(responses) != 1 || responses[0].Error != nil {
		t.Fatalf("unexpected response: %+v", responses)
	}
	if responses[0].Skipped {
		t.Fatal("protected route must still be tested")
	}
	if responses[0].BaselineStatus != http.StatusUnauthorized || responses[0].AttackStatus != http.StatusOK {
		t.Fatalf("baseline=%d attack=%d", responses[0].BaselineStatus, responses[0].AttackStatus)
	}
	if anonymous.Load() != 1 || broken.Load() != 1 || forged.Load() != 1 {
		t.Fatalf("anonymous=%d broken=%d forged=%d", anonymous.Load(), broken.Load(), forged.Load())
	}
}

func jwtJob(rawURL string) types.Job {
	token := "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.sig"
	return types.Job{
		Attack: contracts.AttackItem{
			AttackID:       "atk-jwt",
			Category:       "JWT_CONFUSION",
			TargetLocation: "HEADER",
		},
		Vector: contracts.AttackVector{
			Route:   rawURL,
			Method:  http.MethodGet,
			Headers: map[string]string{"Authorization": "Bearer " + token, "Cookie": "session=abc"},
		},
		Payload: types.PayloadSpec{Value: "none"},
	}
}

func TestExecutePoolClampsZeroConcurrency(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)

	engine := testEngine(0)
	responses := engine.ExecutePool(context.Background(), []types.Job{queryJob(server.URL)})
	if len(responses) != 1 || responses[0].Error != nil {
		t.Fatalf("expected successful job with clamped concurrency, got %+v", responses)
	}
}
