package attack_test

import (
	"encoding/json"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestMapVectorsToJobs(t *testing.T) {
	vectors := []contracts.AttackVector{
		{
			Route:          "https://example.com/login",
			Method:         "POST",
			TargetLocation: "FORM",
			Params:         map[string]string{"email": "", "password": ""},
		},
	}
	attacks := []contracts.AttackItem{
		{
			AttackID:       "atk-1",
			Category:       "SQL_INJECTION",
			TargetLocation: "FORM",
			Payload:        json.RawMessage(`{"field":"email","value":"' OR 1=1 --"}`),
		},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) != 2 {
		t.Fatalf("expected 2 jobs, got %d", len(jobs))
	}
}
