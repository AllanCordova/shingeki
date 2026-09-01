package discovery

import (
	"strings"
	"time"

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
		cfg.MaxClicks = 20
		cfg.MaxFormSubmits = 3
		cfg.ExploreSettle = 800 * time.Millisecond
		cfg.RodEnabled = false
		return cfg
	default:
		return base
	}
}

func CapVectors(vectors []contracts.AttackVector, opts Options) []contracts.AttackVector {
	limit := 0
	if opts.HasMaxRoutes() {
		limit = opts.MaxRoutes
	} else if normalizeDepth(opts.Depth) == contracts.DepthQuick {
		limit = quickMaxVectors
	}
	if limit <= 0 || len(vectors) <= limit {
		return vectors
	}
	return vectors[:limit]
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
