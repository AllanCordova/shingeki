package secrets_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/secrets"
)

func TestFindStripeAndGitHub(t *testing.T) {
	matches := secrets.Find(`const key = "sk_live_shingeki_canary_abide_do_not_use"; const pat = "ghp_shingekiCanaryAbide0000000000000000";`)
	if len(matches) < 2 {
		t.Fatalf("matches=%v", matches)
	}
}

func TestHTTPScannerFindsJSONAndScript(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/config", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"stripe_secret":"sk_live_shingeki_canary_abide_do_not_use"}`))
	})
	mux.HandleFunc("/preview", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<html><script src="/app.js"></script></html>`))
	})
	mux.HandleFunc("/app.js", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/javascript")
		_, _ = w.Write([]byte(`export const GITHUB_PAT_CANARY = "ghp_shingekiCanaryAbide0000000000000000";`))
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<html><a href="/preview">preview</a></html>`))
	})

	server := httptest.NewServer(mux)
	defer server.Close()

	hits, err := secrets.NewHTTPScanner().Scan(context.Background(), server.URL, []contracts.AttackVector{
		{Route: server.URL + "/preview", Method: "GET", TargetLocation: "URL_PATH"},
	}, nil)
	if err != nil {
		t.Fatal(err)
	}

	kinds := map[string]bool{}
	for _, hit := range hits {
		kinds[hit.Kind] = true
		if !strings.Contains(hit.Request, "GET") {
			t.Fatalf("request dump missing GET: %s", hit.Request)
		}
	}
	if !kinds["stripe_sk_live"] {
		t.Fatalf("expected stripe secret, hits=%v", hits)
	}
	if !kinds["github_pat"] {
		t.Fatalf("expected github pat from js, hits=%v", hits)
	}
}
