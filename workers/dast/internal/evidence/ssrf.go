package evidence

import (
	"context"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

// Markers that show the server fetched an internal resource and returned it.
// A reflected URL alone is not enough.
var ssrfMarkers = []string{
	"ami-id",
	"instance-id",
	"root:x:0:0:",
	"lab-secret:",
}

type SSRFValidator struct{}

func NewSSRFValidator() *SSRFValidator {
	return &SSRFValidator{}
}

func (v *SSRFValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "SSRF") {
		return nil
	}

	attack := strings.ToLower(response.AttackBody)
	baseline := strings.ToLower(response.BaselineBody)
	for _, marker := range ssrfMarkers {
		if strings.Contains(attack, marker) && !strings.Contains(baseline, marker) {
			return newFinding(response, "SSRF payload returned internal content that the baseline did not")
		}
	}

	return nil
}
