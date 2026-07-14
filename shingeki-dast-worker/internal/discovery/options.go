package discovery

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
)

type Options struct {
	Depth     string
	StartPath string
	MaxRoutes int
}

func OptionsFromBatch(batch contracts.DispatchBatch) Options {
	return Options{
		Depth:     batch.EffectiveDepth(),
		StartPath: batch.EffectiveStartPath(),
		MaxRoutes: batch.EffectiveMaxRoutes(),
	}
}

func (o Options) HasMaxRoutes() bool {
	return o.MaxRoutes > 0
}

func (o Options) HasStartPath() bool {
	return strings.TrimSpace(o.StartPath) != ""
}

func ApplyDepthAndScope(base config.DiscoveryConfig, opts Options) config.DiscoveryConfig {
	cfg := ApplyDepth(base, opts.Depth)
	if opts.HasMaxRoutes() {
		cfg.MaxPages = opts.MaxRoutes
	}
	return cfg
}

func ResolveSeedURL(targetURL, startPath string) (string, error) {
	startPath = strings.TrimSpace(startPath)
	if startPath == "" {
		return targetURL, nil
	}

	base, err := url.Parse(targetURL)
	if err != nil || base.Scheme == "" || base.Host == "" {
		return "", fmt.Errorf("invalid target url %q", targetURL)
	}

	if strings.Contains(startPath, "://") {
		ref, parseErr := url.Parse(startPath)
		if parseErr != nil {
			return "", fmt.Errorf("invalid start_path url: %w", parseErr)
		}
		if !strings.EqualFold(ref.Scheme, base.Scheme) || !strings.EqualFold(ref.Host, base.Host) {
			return "", fmt.Errorf("start_path must stay on target origin")
		}
		ref.Fragment = ""
		return ref.String(), nil
	}

	if !strings.HasPrefix(startPath, "/") {
		startPath = "/" + startPath
	}
	ref, err := url.Parse(startPath)
	if err != nil {
		return "", fmt.Errorf("invalid start_path: %w", err)
	}
	ref.Fragment = ""

	return base.ResolveReference(ref).String(), nil
}
