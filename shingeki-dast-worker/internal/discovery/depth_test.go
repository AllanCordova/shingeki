package discovery_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery"
)

func TestApplyDepthQuickOverridesLimits(t *testing.T) {
	base := config.DiscoveryConfig{
		MaxDepth:   3,
		MaxPages:   50,
		RodEnabled: true,
	}

	quick := discovery.ApplyDepth(base, contracts.DepthQuick)
	if quick.MaxDepth != 1 || quick.MaxPages != 12 || quick.RodEnabled {
		t.Fatalf("unexpected quick config: %+v", quick)
	}

	full := discovery.ApplyDepth(base, contracts.DepthFull)
	if full != base {
		t.Fatalf("full should keep defaults: %+v", full)
	}
}

func TestCapVectorsQuick(t *testing.T) {
	vectors := make([]contracts.AttackVector, 25)
	capped := discovery.CapVectors(vectors, contracts.DepthQuick)
	if len(capped) != 20 {
		t.Fatalf("expected 20 vectors, got %d", len(capped))
	}

	uncapped := discovery.CapVectors(vectors, contracts.DepthFull)
	if len(uncapped) != 25 {
		t.Fatalf("full should not cap, got %d", len(uncapped))
	}
}
