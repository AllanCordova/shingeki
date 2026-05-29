package injectors_test

import (
	"net/url"
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack/injectors"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestBuildQueryInjection(t *testing.T) {
	job := types.Job{
		Attack: contracts.AttackItem{TargetLocation: "QUERY_PARAMETER"},
		Vector: contracts.AttackVector{
			Route:          "https://example.com/search?q=test",
			Method:         "GET",
			TargetLocation: "QUERY_PARAMETER",
			Params:         map[string]string{"q": "test"},
		},
		ParamKey: "q",
		Payload:  types.PayloadSpec{Value: "' OR 1=1 --"},
	}

	spec, err := injectors.BuildAttack(job)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	parsed, _ := url.Parse(spec.URL)
	if parsed.Query().Get("q") != "' OR 1=1 --" {
		t.Fatalf("unexpected query value: %s", parsed.Query().Get("q"))
	}
}

func TestBuildJSONInjection(t *testing.T) {
	job := types.Job{
		Attack: contracts.AttackItem{TargetLocation: "JSON_BODY"},
		Vector: contracts.AttackVector{
			Route:          "https://example.com/api/login",
			Method:         "POST",
			TargetLocation: "JSON_BODY",
			Params:         map[string]string{"email": "a@b.com"},
		},
		ParamKey: "email",
		Payload:  types.PayloadSpec{Value: "<script>alert(1)</script>"},
	}

	spec, err := injectors.BuildAttack(job)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(spec.Body, "alert(1)") {
		t.Fatalf("expected injected body, got %s", spec.Body)
	}
	if spec.Headers["Content-Type"] != "application/json" {
		t.Fatalf("expected json content type")
	}
}
