package evidence

import (
	"context"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

// Minimum extra bytes before treating a 2xx length jump as boolean SQLi.
const sqlBooleanMinDelta = 500

type SQLBooleanValidator struct{}

func NewSQLBooleanValidator() *SQLBooleanValidator {
	return &SQLBooleanValidator{}
}

func (v *SQLBooleanValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "SQL") {
		return nil
	}
	if !looksLikeSQLInjectionPayload(response.PayloadUsed) {
		return nil
	}
	if response.BaselineStatus >= 400 || response.AttackStatus >= 400 {
		return nil
	}
	if response.AttackStatus == 0 {
		return nil
	}

	baselineLen := len(response.BaselineBody)
	attackLen := len(response.AttackBody)
	if baselineLen == 0 || attackLen <= baselineLen {
		return nil
	}
	delta := attackLen - baselineLen
	if delta < sqlBooleanMinDelta {
		return nil
	}
	if attackLen < baselineLen*2 {
		return nil
	}

	return newFinding(response, "SQL payload doubled a healthy JSON/HTML response, consistent with boolean injection")
}
