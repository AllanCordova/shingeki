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
	if len(jobs) != 1 {
		t.Fatalf("expected 1 job on payload field, got %d", len(jobs))
	}
	if jobs[0].ParamKey != "email" {
		t.Fatalf("expected email param, got %s", jobs[0].ParamKey)
	}
}

func TestMapVectorsToJobsUsesParameterAlias(t *testing.T) {
	vectors := []contracts.AttackVector{
		{
			Route:          "https://example.com/search.php?q=",
			Method:         "GET",
			TargetLocation: "QUERY_PARAMETER",
			Params:         map[string]string{"q": "", "extra": "1"},
		},
	}
	attacks := []contracts.AttackItem{
		{
			AttackID:       "atk-xss",
			Category:       "XSS",
			TargetLocation: "QUERY_PARAMETER",
			Payload:        json.RawMessage(`{"parameter":"q","value":"<script>alert(1)</script>"}`),
		},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) != 1 {
		t.Fatalf("expected 1 job on parameter alias, got %d", len(jobs))
	}
	if jobs[0].ParamKey != "q" {
		t.Fatalf("expected q param, got %s", jobs[0].ParamKey)
	}
	if jobs[0].Payload.Field != "q" {
		t.Fatalf("expected field q, got %s", jobs[0].Payload.Field)
	}
}

func TestMapVectorsToJobsExpandsPayloadValues(t *testing.T) {
	vectors := []contracts.AttackVector{
		{
			Route:          "http://127.0.0.1:8090/browse/welcome.txt",
			Method:         "GET",
			TargetLocation: "URL_PATH",
		},
	}
	attacks := []contracts.AttackItem{
		{
			AttackID:       "atk-path",
			Category:       "PATH_TRAVERSAL",
			TargetLocation: "URL_PATH",
			Payload:        json.RawMessage(`{"value":"../storage/secret.txt","values":["secret.txt"]}`),
		},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) != 2 {
		t.Fatalf("expected 2 payload variants, got %d", len(jobs))
	}
	got := map[string]bool{}
	for _, job := range jobs {
		got[job.Payload.Value] = true
	}
	if !got["secret.txt"] || !got["../storage/secret.txt"] {
		t.Fatalf("expected both path payloads, got %v", got)
	}
}
