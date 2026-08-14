package evidence_test

import (
	"context"
	"testing"
	"time"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
)

func TestRegexValidatorSQL(t *testing.T) {
	validator := evidence.NewRegexValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "SQL_INJECTION",
			},
			Vector: contracts.AttackVector{Route: "/login"},
		},
		PayloadUsed: "' OR 1=1 --",
		AttackBody:  "You have an error in your SQL syntax",
		RawRequest:  "POST /login",
	}

	finding := validator.Analyze(context.Background(), resp)
	if finding == nil {
		t.Fatal("expected finding")
	}
}

func TestRegexValidatorXSSRequiresPayloadReflection(t *testing.T) {
	validator := evidence.NewRegexValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "XSS",
			},
			Vector: contracts.AttackVector{Route: "/search"},
		},
		PayloadUsed: "<script>alert(1)</script>",
		AttackBody:  "<html><script src=\"/app.js\"></script></html>",
		RawRequest:  "GET /search",
	}

	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("did not expect finding for unrelated script tag: %+v", finding)
	}
}

func TestRegexValidatorXSSDetectsReflectedPayload(t *testing.T) {
	validator := evidence.NewRegexValidator()
	payload := "<script>alert(1)</script>"
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "XSS",
			},
			Vector: contracts.AttackVector{Route: "/search"},
		},
		PayloadUsed: payload,
		AttackBody:  "<html><p>" + payload + "</p></html>",
		RawRequest:  "GET /search",
	}

	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected finding when payload is reflected")
	}
}

func TestDiffValidatorStatusChange(t *testing.T) {
	validator := evidence.NewDiffValidator(config.EvidenceConfig{BodyDiffThreshold: 100})
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{AttackID: "atk-1"},
			Vector: contracts.AttackVector{Route: "/api"},
		},
		BaselineStatus: 200,
		AttackStatus:   500,
		PayloadUsed:    "test",
		RawRequest:     "GET /api",
	}

	finding := validator.Analyze(context.Background(), resp)
	if finding == nil {
		t.Fatal("expected finding on status change")
	}
}

func TestTimingValidatorSleep(t *testing.T) {
	validator := evidence.NewTimingValidator(config.EvidenceConfig{TimingTolerance: 2 * time.Second})
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{AttackID: "atk-1"},
			Vector: contracts.AttackVector{Route: "/api"},
		},
		PayloadUsed: "'; SELECT SLEEP(5)--",
		BaselineMs:  100,
		AttackMs:    5200,
		RawRequest:  "POST /api",
	}

	finding := validator.Analyze(context.Background(), resp)
	if finding == nil {
		t.Fatal("expected timing finding")
	}
}
