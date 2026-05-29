package attack

import (
	"context"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
)

type Engine interface {
	MapVectorsToJobs(vectors []contracts.AttackVector, attacks []contracts.AttackItem) []types.Job
	ExecutePool(ctx context.Context, jobs []types.Job) []types.Response
}
