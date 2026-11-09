package queue

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestTimeoutChildKeepsCancelCause(t *testing.T) {
	parent, cancel := context.WithCancelCause(context.Background())
	child, stop := context.WithTimeout(parent, time.Hour)
	defer stop()

	cancel(contracts.ErrDispatchCancelled)

	if !errors.Is(context.Cause(child), contracts.ErrDispatchCancelled) {
		t.Fatalf("cause = %v", context.Cause(child))
	}
}

func TestCancelQueueNameIsUniquePerProcess(t *testing.T) {
	first := cancelQueueName("attacks.dispatch.cancel", "a1b2c3d4")
	second := cancelQueueName("attacks.dispatch.cancel", "e5f60718")
	if first == second {
		t.Fatalf("workers must not share a cancel queue: %s", first)
	}
	if got := cancelQueueName("attacks.dispatch.cancel", "  "); got != "attacks.dispatch.cancel.worker" {
		t.Fatalf("empty instance id = %s", got)
	}
}

func TestCancelBeforeBeginMarksContext(t *testing.T) {
	registry := NewCancelRegistry()
	registry.Cancel("dispatch-1")

	ctx, stop := registry.Begin(context.Background(), "dispatch-1")
	defer stop()

	if !errors.Is(context.Cause(ctx), contracts.ErrDispatchCancelled) {
		t.Fatalf("cause = %v", context.Cause(ctx))
	}
}

func TestCancelDuringRunCancelsContext(t *testing.T) {
	registry := NewCancelRegistry()
	ctx, stop := registry.Begin(context.Background(), "dispatch-1")
	defer stop()

	registry.Cancel("dispatch-1")

	select {
	case <-ctx.Done():
	default:
		t.Fatal("expected context to be cancelled")
	}

	if !errors.Is(context.Cause(ctx), contracts.ErrDispatchCancelled) {
		t.Fatalf("cause = %v", context.Cause(ctx))
	}
}
