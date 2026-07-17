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
	cfg    config.Config
	logger *slog.Logger
}

func NewCompositeEngine(cfg config.Config, logger *slog.Logger) *CompositeEngine {
	if logger == nil {
		logger = slog.Default()
	}
	return &CompositeEngine{
		cfg:    cfg,
		logger: logger,
	}
}

func (e *CompositeEngine) Discover(
	ctx context.Context,
	targetURL string,
	authHeaders map[string]string,
	opts Options,
) ([]contracts.AttackVector, error) {
	discCfg := ApplyDepthAndScope(e.cfg.Discovery, opts)
	seedURL, err := ResolveSeedURL(targetURL, opts.StartPath)
	if err != nil {
		return nil, err
	}
	if seedURL != targetURL {
		e.logger.Info("scoped discovery seed",
			"target", targetURL,
			"seed", seedURL,
			"max_routes", discCfg.MaxPages,
		)
	}

	staticEngine := static.NewCollyCrawler(discCfg, e.cfg.Attack, e.logger)
	dynamicEngine := dynamic.NewRodCrawler(discCfg, e.cfg.Attack, e.logger)

	vectors, err := staticEngine.Discover(ctx, targetURL, authHeaders, seedURL)
	if err != nil {
		return nil, err
	}

	if discCfg.RodEnabled && (opts.HasStartPath() || len(vectors) < discCfg.MinVectorsForRod) {
		dynamicVectors, rodErr := dynamicEngine.Discover(ctx, targetURL, authHeaders, seedURL)
		if rodErr != nil {
			e.logger.Warn("dynamic discovery failed", "error", rodErr)
		} else {
			vectors = mergeVectors(vectors, dynamicVectors)
		}
	}

	if len(vectors) == 0 {
		vectors = fallbackVectors(seedURL)
		e.logger.Warn(
			"discovery produced no vectors; using built-in fallback routes",
			"target", seedURL,
			"fallback_count", len(vectors),
		)
	}

	beforeFilter := len(vectors)
	vectors = FilterAttackable(targetURL, vectors)
	if len(vectors) < beforeFilter {
		e.logger.Info("filtered blocked discovery vectors",
			"before", beforeFilter,
			"after", len(vectors),
		)
	}

	beforeCap := len(vectors)
	vectors = CapVectors(vectors, opts)
	if len(vectors) < beforeCap {
		e.logger.Info("capped discovery vectors for quick depth",
			"before", beforeCap,
			"after", len(vectors),
			"depth", opts.Depth,
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
