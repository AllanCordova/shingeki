package evidence

import (
	"context"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

type SSTIValidator struct{}

func NewSSTIValidator() *SSTIValidator {
	return &SSTIValidator{}
}

func (v *SSTIValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "SSTI") {
		return nil
	}
	if !looksLikeSSTIPayload(response.PayloadUsed) {
		return nil
	}
	if !successStatus(response.AttackStatus) {
		return nil
	}
	if strings.Contains(response.AttackBody, "49") && !strings.Contains(response.BaselineBody, "49") {
		return newFinding(response, "template payload 7*7 evaluated to 49 in the response")
	}
	return nil
}

func looksLikeSSTIPayload(payload string) bool {
	return strings.Contains(payload, "7*7") ||
		strings.Contains(payload, "{{") ||
		strings.Contains(payload, "${") ||
		strings.Contains(payload, "#{")
}
