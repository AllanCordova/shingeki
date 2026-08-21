package contracts_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestProbeMessageValidate(t *testing.T) {
	msg := contracts.ProbeMessage{
		Event:       contracts.EventAttackProbe,
		DispatchID:  "dispatch-1",
		SystemID:    "system-1",
		AttackID:    "attack-1",
		Route:       "http://target.test/login.php",
		PayloadUsed: "' OR 1=1 --",
		HTTPRequest: "POST /login.php",
		Outcome:     "clean",
		Evidence:    "HTTP 200 · nenhum indicador detectado",
	}

	if err := msg.Validate(); err != nil {
		t.Fatalf("expected valid probe message: %v", err)
	}
}

func TestProbeMessageValidateRequiresErrorMessageForErrorOutcome(t *testing.T) {
	msg := contracts.ProbeMessage{
		Event:       contracts.EventAttackProbe,
		DispatchID:  "dispatch-1",
		SystemID:    "system-1",
		AttackID:    "attack-1",
		Route:       "http://target.test/login.php",
		PayloadUsed: "' OR 1=1 --",
		Outcome:     "error",
		Evidence:    "Falha ao executar teste",
	}

	if err := msg.Validate(); err == nil {
		t.Fatal("expected validation error for missing error_message")
	}
}
