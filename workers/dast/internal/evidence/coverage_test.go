package evidence_test

import (
	"context"
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
	validator := evidence.NewSSTIValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "SSTI"},
			Vector: contracts.AttackVector{Route: "http://shop.test/profile"},
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
