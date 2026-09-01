package contracts_test

import (
	"encoding/json"
	"testing"

	"github.com/shingeki/sast-worker/internal/contracts"
)

func TestParseDispatchBatchValidSast(t *testing.T) {
	raw := []byte(`{
		"event": "attack.dispatch.batch",
		"scan_type": "SAST",
		"dispatch_id": "dispatch-1",
		"system_id": "sys-1",
		"user_id": "user-1",
		"target_url": "https://example.com",
		"repository_url": "https://github.com/org/repo",
		"attacks": [{
			"attack_id": "atk-1",
			"category": "SQL_INJECTION",
			"target_location": "SOURCE_CODE",
			"risk_level": "HIGH",
			"payload": {"languages":["php","typescript","javascript"]}
		}],
		"dispatched_at": "2026-05-28T12:00:00Z"
	}`)

	batch, err := contracts.ParseDispatchBatch(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if batch.SystemID != "sys-1" || len(batch.Attacks) != 1 {
		t.Fatalf("unexpected batch: %+v", batch)
	}
	if batch.EffectiveScanType() != contracts.ScanTypeSast {
		t.Fatalf("expected SAST scan type, got %q", batch.EffectiveScanType())
	}
}

func TestParseDispatchBatchDefaultsScanTypeToSast(t *testing.T) {
	raw := []byte(`{
		"event": "attack.dispatch.batch",
		"dispatch_id": "dispatch-1",
		"system_id": "sys-1",
		"user_id": "user-1",
		"repository_url": "https://github.com/org/repo",
		"attacks": [{
			"attack_id": "atk-1",
			"category": "SQL_INJECTION",
			"target_location": "SOURCE_CODE",
			"risk_level": "HIGH",
			"payload": {"languages":["php"]}
		}]
	}`)

	batch, err := contracts.ParseDispatchBatch(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if batch.EffectiveScanType() != contracts.ScanTypeSast {
		t.Fatalf("expected SAST default, got %q", batch.EffectiveScanType())
	}
}

func TestParseDispatchBatchAllowsEmptyRepositoryURL(t *testing.T) {
	raw := []byte(`{
		"event": "attack.dispatch.batch",
		"scan_type": "SAST",
		"dispatch_id": "dispatch-1",
		"system_id": "sys-1",
		"user_id": "user-1",
		"attacks": [{
			"attack_id": "atk-1",
			"category": "SQL_INJECTION",
			"target_location": "SOURCE_CODE",
			"risk_level": "HIGH",
			"payload": {"languages":["php"]}
		}]
	}`)

	batch, err := contracts.ParseDispatchBatch(raw)
	if err != nil {
		t.Fatalf("lab fallback should allow empty repository_url: %v", err)
	}
	if batch.RepositoryURL != "" {
		t.Fatalf("expected empty repository_url, got %q", batch.RepositoryURL)
	}
}

func TestParseDispatchBatchRejectsDast(t *testing.T) {
	raw := []byte(`{
		"event": "attack.dispatch.batch",
		"scan_type": "DAST",
		"dispatch_id": "dispatch-1",
		"system_id": "sys-1",
		"user_id": "user-1",
		"target_url": "https://example.com",
		"repository_url": "https://github.com/org/repo",
		"attacks": [{
			"attack_id": "atk-1",
			"category": "SQL_INJECTION",
			"target_location": "FORM",
			"risk_level": "HIGH",
			"payload": {"field":"email"}
		}],
		"dispatched_at": "2026-05-28T12:00:00Z"
	}`)

	_, err := contracts.ParseDispatchBatch(raw)
	if err == nil {
		t.Fatal("expected validation error for DAST batch")
	}
}

func TestPayloadLanguagesAndRef(t *testing.T) {
	batch := contracts.DispatchBatch{
		RepositoryRef: "",
		Attacks: []contracts.AttackItem{
			{Payload: json.RawMessage(`{"languages":["php","typescript"],"branch":"main"}`)},
			{Payload: json.RawMessage(`{"languages":["php","javascript"]}`)},
		},
	}

	got := batch.PayloadLanguages()
	if len(got) != 3 {
		t.Fatalf("expected 3 unique languages, got %v", got)
	}
	if batch.EffectiveRepositoryRef() != "main" {
		t.Fatalf("expected ref main, got %q", batch.EffectiveRepositoryRef())
	}
}

func TestResultMessageValidate(t *testing.T) {
	msg := contracts.ResultMessage{
		DispatchID:      "dispatch-1",
		AttackID:        "atk-1",
		SystemID:        "sys-1",
		VulnerableRoute: "src/app.php:42",
		PayloadUsed:     "php.lang.security.sql-injection",
		Evidence:        "proof",
		HTTPRequest:     "file: src/app.php",
	}
	if err := msg.Validate(); err != nil {
		t.Fatalf("expected valid message: %v", err)
	}
}
