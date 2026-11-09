package evidence_test

import (
	"context"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
)

func TestSSRFValidatorConfirmsInternalContent(t *testing.T) {
	validator := evidence.NewSSRFValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "SSRF"},
			Vector: contracts.AttackVector{Route: "https://lab.test/profile/image/url"},
		},
		PayloadUsed:    "http://169.254.169.254/latest/meta-data/",
		BaselineStatus: 200,
		AttackStatus:   200,
		BaselineBody:   `{"image":"ok"}`,
		AttackBody:     "ami-id\ni-123456",
	}
	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected SSRF finding")
	}
}

func TestSSRFValidatorIgnoresReflectedURL(t *testing.T) {
	validator := evidence.NewSSRFValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "SSRF"},
			Vector: contracts.AttackVector{Route: "https://lab.test/fetch"},
		},
		PayloadUsed:  "http://127.0.0.1/",
		AttackStatus: 200,
		BaselineBody: "ok",
		AttackBody:   "could not fetch http://127.0.0.1/",
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("reflected URL is not SSRF evidence: %q", finding.Evidence)
	}
}
