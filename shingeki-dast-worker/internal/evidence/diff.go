package evidence

import (
	"context"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
)

type DiffValidator struct {
	threshold int
}

func NewDiffValidator(cfg config.EvidenceConfig) *DiffValidator {
	return &DiffValidator{threshold: cfg.BodyDiffThreshold}
}

func (v *DiffValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if response.BaselineStatus != response.AttackStatus {
		return newFinding(response, "HTTP status changed between baseline and attack request")
	}

	diff := len(response.AttackBody) - len(response.BaselineBody)
	if diff < 0 {
		diff = -diff
	}
	if diff >= v.threshold {
		return newFinding(response, "response body length changed beyond configured threshold")
	}

	return nil
}
