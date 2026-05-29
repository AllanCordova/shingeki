package contracts_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestDispatchCompletionMessageValidate(t *testing.T) {
	msg := contracts.DispatchCompletionMessage{
		Event:         contracts.EventDispatchCompleted,
		DispatchID:    "dispatch-1",
		SystemID:      "system-1",
		DurationMs:    1500,
		FindingsCount: 0,
	}

	if err := msg.Validate(); err != nil {
		t.Fatalf("expected valid completion message: %v", err)
	}
}
