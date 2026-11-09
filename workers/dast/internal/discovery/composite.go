package discovery

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/dynamic"
	"github.com/shingeki/dast-worker/internal/discovery/static"
)

type CompositeEngine struct {
	cfg     config.Config
	logger  *slog.Logger
	static  crawlEngine
	dynamic crawlEngine
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
	auth *contracts.TargetAuth,
	opts Options,
) ([]contracts.AttackVector, error) {
	if opts.HasRouteMap() {
		return e.discoverRouteMap(ctx, targetURL, auth, opts)
	}

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

	staticEngine := e.static
	if staticEngine == nil {
		staticEngine = static.NewCollyCrawler(discCfg, e.cfg.Attack, e.logger)
	}
	dynamicEngine := e.dynamic
	if dynamicEngine == nil {
		dynamicEngine = dynamic.NewRodCrawler(discCfg, e.cfg.Attack, e.logger)
	}

	var vectors []contracts.AttackVector

	if discCfg.RodEnabled {
		dynamicVectors, rodErr := dynamicEngine.Discover(ctx, targetURL, auth, seedURL)
		if rodErr != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			e.logger.Warn("dynamic discovery failed; falling back to static crawl", "error", rodErr)
			staticVectors, staticErr := staticEngine.Discover(ctx, targetURL, auth, seedURL)
			if staticErr != nil {
				return nil, staticErr
			}
			vectors = staticVectors
		} else {
			staticVectors, staticErr := staticEngine.Discover(ctx, targetURL, auth, seedURL)
			if staticErr != nil && len(dynamicVectors) == 0 {
				return nil, staticErr
			}
			if staticErr != nil {
				e.logger.Warn("static discovery failed; keeping browser routes", "error", staticErr)
			}
			vectors = mergeAttackVectors(dynamicVectors, staticVectors)
			if len(dynamicVectors) < discCfg.MinVectorsForRod {
				e.logger.Warn("dynamic discovery below threshold; static crawl filled the gap",
					"dynamic", len(dynamicVectors),
					"static", len(staticVectors),
					"min", discCfg.MinVectorsForRod,
				)
			}
		}
	} else {
		staticVectors, staticErr := staticEngine.Discover(ctx, targetURL, auth, seedURL)
		if staticErr != nil {
			return nil, staticErr
		}
		vectors = staticVectors
	}

	beforeRecorded := len(vectors)
	vectors = AppendRecordedRoutes(targetURL, vectors, auth)
	if len(vectors) > beforeRecorded {
		e.logger.Info("merged captured network routes into discovery",
			"added", len(vectors)-beforeRecorded,
			"total", len(vectors),
		)
	}

	if len(vectors) == 0 {
		vectors = fallbackVectors(seedURL)
		e.logger.Warn(
			"discovery produced no vectors; using seed as fallback route",
			"target", seedURL,
			"fallback_count", len(vectors),
		)
	}

	beforeFilter := len(vectors)
	vectors = CanonicalizeQueryVectors(vectors)
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
		e.logger.Info("capped discovery vectors",
			"before", beforeCap,
			"after", len(vectors),
			"depth", opts.Depth,
			"max_routes", opts.MaxRoutes,
		)
	}

	return vectors, nil
}

func (e *CompositeEngine) discoverRouteMap(
	ctx context.Context,
	targetURL string,
	auth *contracts.TargetAuth,
	opts Options,
) ([]contracts.AttackVector, error) {
	vectors, err := VectorsFromRouteMap(targetURL, opts.RouteMap)
	if err != nil {
		return nil, err
	}
	if len(vectors) == 0 {
		return nil, fmt.Errorf("route map produced no attackable routes")
	}

	e.logger.Info("using exclusive route map",
		"routes", len(opts.RouteMap),
		"vectors", len(vectors),
	)

	return vectors, nil
}

func mergeAttackVectors(primary, extra []contracts.AttackVector) []contracts.AttackVector {
	index := make(map[string]int, len(primary)+len(extra))
	out := make([]contracts.AttackVector, 0, len(primary)+len(extra))
	for _, vector := range append(primary, extra...) {
		key := vector.Method + " " + vector.Route + " " + vector.TargetLocation
		if at, exists := index[key]; exists {
			out[at] = contracts.MergeVector(out[at], vector)
			continue
		}
		index[key] = len(out)
		out = append(out, vector)
	}
	return out
}
