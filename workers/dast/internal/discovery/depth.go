package discovery

import (
	"strings"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
)

const quickMaxVectors = 20

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

func CapVectors(vectors []contracts.AttackVector, opts Options) []contracts.AttackVector {
	if opts.HasMaxRoutes() || opts.HasStartPath() {
		return vectors
	}
	if normalizeDepth(opts.Depth) != contracts.DepthQuick {
		return vectors
	}
	if len(vectors) <= quickMaxVectors {
		return vectors
	}
	return vectors[:quickMaxVectors]
}

func FilterAttackable(targetURL string, vectors []contracts.AttackVector) []contracts.AttackVector {
	if len(vectors) == 0 {
		return vectors
	}
	out := make([]contracts.AttackVector, 0, len(vectors))
	for _, vector := range vectors {
		if bfs.IsAttackableDiscoveryURL(targetURL, vector.Route) {
			out = append(out, vector)
		}
	}
	return out
}

func normalizeDepth(depth string) string {
	return strings.ToLower(strings.TrimSpace(depth))
}
