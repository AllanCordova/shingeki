package discovery

import (
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
	"github.com/shingeki/dast-worker/pkg/targeturl"
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

func CanonicalizeQueryVectors(vectors []contracts.AttackVector) []contracts.AttackVector {
	if len(vectors) == 0 {
		return vectors
	}
	seen := make(map[string]int, len(vectors))
	out := make([]contracts.AttackVector, 0, len(vectors))
	for _, vector := range vectors {
		next := cloneVector(vector)
		if next.TargetLocation == "QUERY_PARAMETER" {
			next.Route = targeturl.CanonicalSinkRoute(next.Route)
			for key := range next.Params {
				next.Params[key] = ""
			}
		}
		key := next.Method + " " + next.Route + " " + next.TargetLocation
		if index, ok := seen[key]; ok {
			if out[index].Params == nil {
				out[index].Params = map[string]string{}
			}
			for param, value := range next.Params {
				if _, exists := out[index].Params[param]; !exists {
					out[index].Params[param] = value
				}
			}
			continue
		}
		seen[key] = len(out)
		out = append(out, next)
	}
	return out
}

func cloneVector(vector contracts.AttackVector) contracts.AttackVector {
	next := vector
	if vector.Params != nil {
		next.Params = make(map[string]string, len(vector.Params))
		for key, value := range vector.Params {
			next.Params[key] = value
		}
	}
	if vector.Headers != nil {
		next.Headers = make(map[string]string, len(vector.Headers))
		for key, value := range vector.Headers {
			next.Headers[key] = value
		}
	}
	return next
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
