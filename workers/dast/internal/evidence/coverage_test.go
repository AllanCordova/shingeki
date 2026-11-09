package evidence_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
)

func TestRedirectValidatorDetectsOffOriginLocation(t *testing.T) {
	validator := evidence.NewRedirectValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "OPEN_REDIRECT"},
			Vector: contracts.AttackVector{Route: "http://shop.test/redirect?to="},
		},
		AttackStatus:   302,
		AttackLocation: "https://github.com/juice-shop/juice-shop.evil.invalid",
		PayloadUsed:    "https://github.com/juice-shop/juice-shop.evil.invalid",
	}
	if validator.Analyze(context.Background(), resp) == nil {
		t.Fatal("expected redirect finding")
	}
}

func TestRedirectValidatorDetectsBodyLink(t *testing.T) {
	validator := evidence.NewRedirectValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "OPEN_REDIRECT"},
			Vector: contracts.AttackVector{Route: "https://shop.test/blog?back="},
		},
		BaselineStatus: 200,
		AttackStatus:   200,
		BaselineBody:   `<html><a href="/blog/">back</a></html>`,
		AttackBody:     `<html><a href="https://evil.invalid/">back</a></html>`,
		PayloadUsed:    "https://evil.invalid",
	}
	if validator.Analyze(context.Background(), resp) == nil {
		t.Fatal("expected body redirect finding")
	}
}

func TestRedirectValidatorIgnoresPlainTextEcho(t *testing.T) {
	validator := evidence.NewRedirectValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "OPEN_REDIRECT"},
			Vector: contracts.AttackVector{Route: "https://shop.test/blog?back="},
		},
		AttackStatus: 200,
		AttackBody:   `<html><body>blocked redirect to https://evil.invalid</body></html>`,
		PayloadUsed:  "https://evil.invalid",
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("plain text echo must not confirm: %q", finding.Evidence)
	}
}

func TestRedirectValidatorIgnoresSameHost(t *testing.T) {
	validator := evidence.NewRedirectValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "OPEN_REDIRECT"},
			Vector: contracts.AttackVector{Route: "http://shop.test/redirect?to="},
		},
		AttackStatus:   302,
		AttackLocation: "http://shop.test/#/home",
		PayloadUsed:    "/home",
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("same-host redirect must not confirm: %q", finding.Evidence)
	}
}

func TestJWTValidatorRequiresBrokenBaseline(t *testing.T) {
	validator := evidence.NewJWTValidator()
	body := `{"status":"success","data":[{"email":"admin@juice-sh.op","role":"admin"}]}`
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "JWT_CONFUSION"},
			Vector: contracts.AttackVector{Route: "http://shop.test/api/Users/"},
		},
		BaselineStatus: 401,
		AttackStatus:   200,
		AttackBody:     body,
		PayloadUsed:    "none",
	}
	if validator.Analyze(context.Background(), resp) == nil {
		t.Fatal("expected JWT none finding")
	}
	resp.BaselineStatus = 200
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("valid baseline must not confirm none: %q", finding.Evidence)
	}
}

func TestSSTIValidatorDetectsEvaluatedExpression(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.RawQuery, "47%2A53") || strings.Contains(r.URL.RawQuery, "47*53") {
			_, _ = w.Write([]byte("<p>2491</p>"))
			return
		}
		http.NotFound(w, r)
	}))
	defer server.Close()

	validator := evidence.NewSSTIValidator()
	resp := types.Response{
		Job: types.Job{
			Attack:   contracts.AttackItem{Category: "SSTI", TargetLocation: "QUERY_PARAMETER"},
			ParamKey: "q",
			Payload:  types.PayloadSpec{Value: "{{7*7}}"},
			Vector: contracts.AttackVector{
				Route:  server.URL + "/profile",
				Params: map[string]string{"q": "hi"},
			},
		},
		BaselineStatus: 200,
		AttackStatus:   200,
		BaselineBody:   `<p>hi</p>`,
		AttackBody:     `<p>49</p>`,
		PayloadUsed:    "{{7*7}}",
	}
	if validator.Analyze(context.Background(), resp) == nil {
		t.Fatal("expected SSTI finding")
	}
}
