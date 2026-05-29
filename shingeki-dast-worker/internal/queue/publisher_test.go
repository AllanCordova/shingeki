package queue_test

import (
	"encoding/json"
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestResultMessageMatchesLaravelContract(t *testing.T) {
	msg := contracts.ResultMessage{
		DispatchID:      "dispatch-uuid",
		AttackID:        "attack-uuid",
		SystemID:        "system-uuid",
		VulnerableRoute: "/api/login",
		PayloadUsed:     "' OR 1=1 --",
		Evidence:        "SQL error signature detected in response body",
		HTTPRequest:     "POST /api/login HTTP/1.1\r\nHost: example.com\r\n\r\n",
	}

	data, err := msg.MarshalJSONBytes()
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded map[string]string
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("decode failed: %v", err)
	}

	for _, key := range []string{"dispatch_id", "attack_id", "system_id", "vulnerable_route", "payload_used", "evidence", "http_request"} {
		if decoded[key] == "" {
			t.Fatalf("missing key %s in payload", key)
		}
	}
}
