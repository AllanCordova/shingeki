package evidence

import (
	"context"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

type XXEValidator struct{}

func NewXXEValidator() *XXEValidator {
	return &XXEValidator{}
}

func (v *XXEValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "XXE") {
		return nil
	}
	attackLower := strings.ToLower(response.AttackBody)
	baselineLower := strings.ToLower(response.BaselineBody)
	for _, marker := range pathTraversalMarkers {
		markerLower := strings.ToLower(marker)
		if strings.Contains(attackLower, markerLower) && !strings.Contains(baselineLower, markerLower) {
			return newFinding(response, "XXE payload leaked local file content")
		}
	}
	return nil
}
