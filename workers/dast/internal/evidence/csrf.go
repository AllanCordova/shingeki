package evidence

import (
	"context"
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

type CSRFValidator struct{}

func NewCSRFValidator() *CSRFValidator {
	return &CSRFValidator{}
}

func (v *CSRFValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !isCSRFCategory(response.Job.Attack.Category) {
		return nil
	}
	if !csrfEligibleMethod(response.Job.Vector.Method, response.Job.Vector.Route) {
		return nil
	}
	if !hasRequestAuth(response.Job.Vector.Headers) {
		return nil
	}
	if !successStatus(response.AttackStatus) {
		return nil
	}

	if csrfTokenStripped(response) {
		return newFinding(response, "state-changing request succeeded without a CSRF token")
	}
	if crossSiteForgeryHeader(response) {
		return newFinding(response, "state-changing request succeeded with a cross-origin Origin or Referer")
	}
	return nil
}

func isCSRFCategory(category string) bool {
	return strings.Contains(strings.ToUpper(category), "CSRF")
}

func csrfEligibleMethod(method, route string) bool {
	switch strings.ToUpper(strings.TrimSpace(method)) {
	case "POST", "PUT", "PATCH", "DELETE":
		return true
	case "GET":
		return strings.Contains(strings.ToLower(route), "change-password")
	default:
		return false
	}
}

func csrfTokenStripped(response types.Response) bool {
	if !isCSRFTokenKey(response.Job.ParamKey) && !isCSRFTokenKey(response.Job.Payload.Field) {
		return false
	}
	return isStrippedCSRFToken(response.PayloadUsed)
}

func isCSRFTokenKey(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "csrf", "_csrf", "csrf_token", "csrftoken", "_token", "token",
		"authenticity_token", "xsrf", "xsrf-token", "x-csrf-token", "x-xsrf-token":
		return true
	default:
		return false
	}
}

func isStrippedCSRFToken(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "missing", "null", "none", "nil", "undefined", "0", "invalid", "false":
		return true
	default:
		return false
	}
}

func crossSiteForgeryHeader(response types.Response) bool {
	key := strings.ToLower(strings.TrimSpace(response.Job.ParamKey))
	if key == "" {
		key = strings.ToLower(strings.TrimSpace(response.Job.Payload.Field))
	}
	if key != "origin" && key != "referer" {
		return false
	}
	payload := strings.TrimSpace(response.PayloadUsed)
	if payload == "" {
		return false
	}
	parsed, err := url.Parse(payload)
	if err != nil || parsed.Host == "" {
		return strings.Contains(strings.ToLower(payload), "evil.") ||
			strings.Contains(strings.ToLower(payload), "attacker.")
	}
	target, err := url.Parse(response.Job.Vector.Route)
	if err != nil || target.Host == "" {
		return true
	}
	return !strings.EqualFold(parsed.Host, target.Host)
}
