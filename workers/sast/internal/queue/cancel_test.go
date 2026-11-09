package queue

import (
	"context"
	"errors"
	"testing"

	"github.com/shingeki/sast-worker/internal/contracts"
)

func TestCancelQueueNameIsUniquePerProcess(t *testing.T) {
	first := cancelQueueName("attacks.sast.dispatch.cancel", "a1b2c3d4")
	second := cancelQueueName("attacks.sast.dispatch.cancel", "e5f60718")
	if first == second {
		t.Fatalf("workers must not share a cancel queue: %s", first)
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
