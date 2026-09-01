package contracts_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestParseDispatchBatchValid(t *testing.T) {
	raw := []byte(`{
		"event": "attack.dispatch.batch",
		"dispatch_id": "dispatch-1",
		"system_id": "sys-1",
		"user_id": "user-1",
		"target_url": "https://example.com",
		"repository_url": "https://github.com/org/repo",
		"start_path": "/products",
		"max_routes": 50,
		"attacks": [{
			"attack_id": "atk-1",
			"category": "SQL_INJECTION",
			"target_location": "FORM",
			"risk_level": "HIGH",
			"payload": {"field":"email","value":"' OR 1=1 --"}
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
	if batch.EffectiveStartPath() != "/products" || batch.EffectiveMaxRoutes() != 50 {
		t.Fatalf("unexpected scope: start=%q max=%d", batch.EffectiveStartPath(), batch.EffectiveMaxRoutes())
	}
}

func TestParseDispatchBatchRejectsFileTargetURL(t *testing.T) {
	raw := []byte(`{
		"event": "attack.dispatch.batch",
		"dispatch_id": "dispatch-1",
		"system_id": "sys-1",
		"user_id": "user-1",
		"target_url": "file:///etc/passwd",
		"attacks": [{
			"attack_id": "atk-1",
			"category": "SQL_INJECTION",
			"target_location": "FORM",
			"risk_level": "HIGH",
			"payload": {"field":"email","value":"' OR 1=1 --"}
		}]
	}`)

	if _, err := contracts.ParseDispatchBatch(raw); err == nil {
		t.Fatal("expected validation error for file target url")
	}
}

func TestParseDispatchBatchRejectsSast(t *testing.T) {
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
			"payload": {"languages":["php"]}
		}],
		"dispatched_at": "2026-05-28T12:00:00Z"
	}`)

	_, err := contracts.ParseDispatchBatch(raw)
	if err == nil {
		t.Fatal("expected validation error for SAST batch on dast worker")
	}
}

func TestResultMessageValidate(t *testing.T) {
	msg := contracts.ResultMessage{
		DispatchID:      "dispatch-1",
		AttackID:        "atk-1",
		SystemID:        "sys-1",
		VulnerableRoute: "/login",
		PayloadUsed:     "test",
		Evidence:        "proof",
		HTTPRequest:     "GET / HTTP/1.1",
	}
	if err := msg.Validate(); err != nil {
		t.Fatalf("expected valid message: %v", err)
	}
}

func TestParseDispatchBatchAcceptsPHPEmptySessionArray(t *testing.T) {
	raw := []byte(`{
		"event": "attack.dispatch.batch",
		"dispatch_id": "dispatch-1",
		"system_id": "sys-1",
		"user_id": "user-1",
		"target_url": "https://example.com",
		"attacks": [{
			"attack_id": "atk-1",
			"category": "SQL_INJECTION",
			"target_location": "JSON_BODY",
			"risk_level": "HIGH",
			"payload": {"value":"' or 1=1--"}
		}],
		"auth": {
			"type": "COOKIE",
			"headers": {},
			"storage": {
				"local": {"token": "aaa.bbb.ccc"},
				"session": []
			}
		},
		"dispatched_at": "2026-05-28T12:00:00Z"
	}`)

	batch, err := contracts.ParseDispatchBatch(raw)
	if err != nil {
		t.Fatalf("empty PHP session array must parse: %v", err)
	}
	if batch.Auth == nil || batch.Auth.Storage == nil {
		t.Fatal("expected storage")
	}
	if batch.Auth.Storage.Local["token"] != "aaa.bbb.ccc" {
		t.Fatalf("local=%v", batch.Auth.Storage.Local)
	}
	if len(batch.Auth.Storage.Session) != 0 {
		t.Fatalf("session should be empty, got %v", batch.Auth.Storage.Session)
	}
}
