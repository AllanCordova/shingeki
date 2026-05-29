package discovery

import (
	"context"

	"github.com/shingeki/dast-worker/internal/contracts"
)

type Engine interface {
	Discover(ctx context.Context, targetURL string) ([]contracts.AttackVector, error)
}
