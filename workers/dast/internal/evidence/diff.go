package evidence

import (
	"context"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
)

type DiffValidator struct {
	threshold int
}

func NewDiffValidator(cfg config.EvidenceConfig) *DiffValidator {
	threshold := cfg.BodyDiffThreshold
	if threshold < 1 {
		threshold = 1
	}
	return &DiffValidator{threshold: threshold}
}

func (v *DiffValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !allowsDiffConfirmation(response.Job.Attack.Category) {
		return nil
	}

	diff := len(response.AttackBody) - len(response.BaselineBody)
	if diff < 0 {
		diff = -diff
	}
	if diff > v.threshold {
		return newFinding(response, "response body length changed beyond configured threshold")
	}

	return nil
}

func allowsDiffConfirmation(category string) bool {
	upper := strings.ToUpper(category)
	if strings.Contains(upper, "PATH") {
		return false
	}
	if strings.Contains(upper, "XSS") {
		return false
	}
	if strings.Contains(upper, "SQL") {
		return false
	}
	return true
}
