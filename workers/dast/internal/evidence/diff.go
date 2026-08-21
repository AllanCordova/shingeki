package evidence

import (
	"context"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
)

// DiffValidator confirms attacks only for categories where a response delta is a
// meaningful signal. Path traversal and XSS must use content-based validators
// — body length / status alone produce false positives on SPA/CDN targets.
type DiffValidator struct {
	threshold int
}

func NewDiffValidator(cfg config.EvidenceConfig) *DiffValidator {
	return &DiffValidator{threshold: cfg.BodyDiffThreshold}
}

func (v *DiffValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !allowsDiffConfirmation(response.Job.Attack.Category) {
		return nil
	}

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

func allowsDiffConfirmation(category string) bool {
	upper := strings.ToUpper(category)
	if strings.Contains(upper, "PATH") {
		return false
	}
	if strings.Contains(upper, "XSS") {
		return false
	}
	if strings.Contains(upper, "SQL") {
		// Prefer regex/error signatures; plain status/length diffs are noisy.
		return false
	}
	return true
}
