package evidence

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/attack/injectors"
	"github.com/shingeki/dast-worker/internal/attack/types"
)

const (
	sstiExpression  = "7*7"
	sstiSiblingExpr = "47*53"
	sstiEvidence    = "template expression evaluated to 49 and a second expression evaluated to 2491"
)

var (
	standalone49   = regexp.MustCompile(`(?:^|[^0-9])49(?:[^0-9]|$)`)
	standalone2491 = regexp.MustCompile(`(?:^|[^0-9])2491(?:[^0-9]|$)`)
)

// SSTIValidator confirms arithmetic template evaluation.
// A single new "49" is not enough: the expression must be gone, and a second
// expression with a rarer product must evaluate in the same field.
type SSTIValidator struct {
	client *http.Client
}

func NewSSTIValidator() *SSTIValidator {
	return &SSTIValidator{client: &http.Client{Timeout: 8 * time.Second}}
}

func (v *SSTIValidator) Analyze(ctx context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "SSTI") {
		return nil
	}
	if !successStatus(response.AttackStatus) {
		return nil
	}
	payload := sstiPayload(response)
	if !strings.Contains(payload, sstiExpression) {
		return nil
	}
	if !standalone49.MatchString(response.AttackBody) || standalone49.MatchString(response.BaselineBody) {
		return nil
	}
	if strings.Contains(response.AttackBody, sstiExpression) {
		return nil
	}
	if !v.siblingConfirms(ctx, response, payload) {
		return nil
	}
	return newFinding(response, sstiEvidence)
}

func sstiPayload(response types.Response) string {
	if strings.TrimSpace(response.Job.Payload.Value) != "" {
		return response.Job.Payload.Value
	}
	return response.PayloadUsed
}

func (v *SSTIValidator) siblingConfirms(ctx context.Context, response types.Response, payload string) bool {
	sibling := strings.ReplaceAll(payload, sstiExpression, sstiSiblingExpr)
	if sibling == payload || strings.TrimSpace(response.Job.Vector.Route) == "" {
		return false
	}
	job := response.Job
	job.Payload.Value = sibling
	spec, err := injectors.BuildAttack(job)
	if err != nil {
		return false
	}
	status, body, err := sendSpec(ctx, v.client, spec)
	if err != nil || !successStatus(status) {
		return false
	}
	if strings.Contains(body, sstiSiblingExpr) {
		return false
	}
	if !standalone2491.MatchString(body) || standalone2491.MatchString(response.BaselineBody) {
		return false
	}
	return true
}
