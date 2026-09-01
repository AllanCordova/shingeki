package discovery

import (
	"context"

	"github.com/shingeki/dast-worker/internal/contracts"
)

type Engine interface {
	Discover(
		ctx context.Context,
		targetURL string,
		auth *contracts.TargetAuth,
		opts Options,
	) ([]contracts.AttackVector, error)
}

type crawlEngine interface {
	Discover(
		ctx context.Context,
		targetURL string,
		auth *contracts.TargetAuth,
		seedURL string,
	) ([]contracts.AttackVector, error)
}
