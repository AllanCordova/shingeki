package evidence_test

import (
	"context"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
)

func TestCSRFValidatorConfirmsStrippedTokenOnPOST(t *testing.T) {
	validator := evidence.NewCSRFValidator()
	resp := types.Response{
		Job: types.Job{
			Attack:   contracts.AttackItem{AttackID: "csrf-1", Category: "CSRF"},
			Vector:   contracts.AttackVector{Route: "http://shop.test/account", Method: "POST", Headers: map[string]string{"Cookie": "sid=1"}},
			ParamKey: "_csrf",
		},
		PayloadUsed:  "",
		AttackStatus: 200,
	}
	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected CSRF finding for stripped token")
	}
}

func TestCSRFValidatorConfirmsCrossOriginOnChangePassword(t *testing.T) {
	validator := evidence.NewCSRFValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{AttackID: "csrf-2", Category: "CSRF"},
			Vector: contracts.AttackVector{
				Route:   "http://shop.test/rest/user/change-password",
				Method:  "GET",
				Headers: map[string]string{"Authorization": "Bearer tok"},
			},
			ParamKey: "Origin",
			Payload:  types.PayloadSpec{Field: "Origin", Value: "https://evil.invalid"},
		},
		PayloadUsed:  "https://evil.invalid",
		AttackStatus: 200,
	}
	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected CSRF finding for cross-origin change-password")
	}
}

func TestCSRFValidatorRejectsUnrelatedFormField(t *testing.T) {
	validator := evidence.NewCSRFValidator()
	resp := types.Response{
		Job: types.Job{
			Attack:   contracts.AttackItem{AttackID: "csrf-3", Category: "CSRF"},
			Vector:   contracts.AttackVector{Route: "http://shop.test/login", Method: "POST", Headers: map[string]string{"Cookie": "sid=1"}},
			ParamKey: "email",
		},
		PayloadUsed:  "",
		AttackStatus: 200,
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("empty email must not confirm CSRF: %q", finding.Evidence)
	}
}

func TestCSRFValidatorRequiresAuthAndSuccess(t *testing.T) {
	validator := evidence.NewCSRFValidator()
	base := types.Response{
		Job: types.Job{
			Attack:   contracts.AttackItem{Category: "CSRF"},
			Vector:   contracts.AttackVector{Route: "http://shop.test/account", Method: "POST", Headers: map[string]string{"Cookie": "sid=1"}},
			ParamKey: "_csrf",
		},
		PayloadUsed:  "missing",
		AttackStatus: 200,
	}
	noAuth := base
	noAuth.Job.Vector.Headers = nil
	if finding := validator.Analyze(context.Background(), noAuth); finding != nil {
		t.Fatal("CSRF without session must not confirm")
	}
	failed := base
	failed.AttackStatus = 403
	if finding := validator.Analyze(context.Background(), failed); finding != nil {
		t.Fatal("failed CSRF probe must not confirm")
	}
}
