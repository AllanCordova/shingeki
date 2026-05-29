package discovery

import (
	"context"
	"log/slog"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/dynamic"
	"github.com/shingeki/dast-worker/internal/discovery/static"
)

type CompositeEngine struct {
	static  *static.CollyCrawler
	dynamic *dynamic.RodCrawler
	cfg     config.DiscoveryConfig
	logger  *slog.Logger
}

func NewCompositeEngine(cfg config.Config, logger *slog.Logger) *CompositeEngine {
	if logger == nil {
		logger = slog.Default()
	}
	return &CompositeEngine{
		static:  static.NewCollyCrawler(cfg.Discovery, cfg.Attack, logger),
		dynamic: dynamic.NewRodCrawler(cfg.Discovery, cfg.Attack, logger),
		cfg:     cfg.Discovery,
		logger:  logger,
	}
}

func (e *CompositeEngine) Discover(ctx context.Context, targetURL string) ([]contracts.AttackVector, error) {
	vectors, err := e.static.Discover(ctx, targetURL)
	if err != nil {
		return nil, err
	}

	if e.cfg.RodEnabled && len(vectors) < e.cfg.MinVectorsForRod {
		dynamicVectors, rodErr := e.dynamic.Discover(ctx, targetURL)
		if rodErr != nil {
			e.logger.Warn("dynamic discovery failed", "error", rodErr)
		} else {
			vectors = mergeVectors(vectors, dynamicVectors)
		}
	}

	// Quando o crawl falha (alvo offline, timeout do Rod, etc.), o fallback antigo
	// gerava apenas GET na raiz com API_ENDPOINT — incompativel com o catalogo
	// (FORM, QUERY_PARAMETER, URL_PATH) e resultava em jobs=0.
	if len(vectors) == 0 {
		vectors = fallbackVectors(targetURL)
		e.logger.Warn(
			"discovery produced no vectors; using built-in fallback routes",
			"target", targetURL,
			"fallback_count", len(vectors),
		)
	}

	return vectors, nil
}

func mergeVectors(base, extra []contracts.AttackVector) []contracts.AttackVector {
	seen := make(map[string]struct{}, len(base))
	for _, v := range base {
		seen[vectorKey(v)] = struct{}{}
	}
	for _, v := range extra {
		key := vectorKey(v)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		base = append(base, v)
	}
	return base
}

func vectorKey(v contracts.AttackVector) string {
	return v.Method + " " + v.Route + " " + v.TargetLocation
}
