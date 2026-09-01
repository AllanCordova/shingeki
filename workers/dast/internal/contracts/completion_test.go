package contracts_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestDispatchCompletionMessageValidate(t *testing.T) {
	msg := contracts.DispatchCompletionMessage{
		Event:             contracts.EventDispatchCompleted,
		DispatchID:        "dispatch-1",
		SystemID:          "system-1",
		DurationMs:        1500,
		FindingsCount:     0,
		ProbesCount:       12,
		VectorsDiscovered: 4,
		JobsPlanned:       12,
		Status:            contracts.CompletionStatusCompleted,
	}

	if err := msg.Validate(); err != nil {
		t.Fatalf("expected valid completion message: %v", err)
	}
}
