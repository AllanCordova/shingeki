package discovery

import (
	"strings"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
)

const quickMaxVectors = 20

// ApplyDepth returns discovery limits for the requested attack depth.
// Unknown/empty depth keeps worker defaults (full).
func ApplyDepth(base config.DiscoveryConfig, depth string) config.DiscoveryConfig {
	switch normalizeDepth(depth) {
	case contracts.DepthQuick:
		cfg := base
		cfg.MaxDepth = 1
		cfg.MaxPages = 12
		cfg.RodEnabled = false
		return cfg
	default:
		return base
	}
}

func CapVectors(vectors []contracts.AttackVector, depth string) []contracts.AttackVector {
	if normalizeDepth(depth) != contracts.DepthQuick {
		return vectors
	}
	if len(vectors) <= quickMaxVectors {
		return vectors
	}
	return vectors[:quickMaxVectors]
}

func normalizeDepth(depth string) string {
	return strings.ToLower(strings.TrimSpace(depth))
}
