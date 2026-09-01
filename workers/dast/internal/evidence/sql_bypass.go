package evidence

import (
	"context"
	"regexp"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

var (
	passwordInputPattern = regexp.MustCompile(`(?i)<input[^>]+type=["']password["']`)
	authSuccessPatterns  = []*regexp.Regexp{
		regexp.MustCompile(`(?i)href=["'][^"']*logout`),
		regexp.MustCompile(`(?i)>(\s*)(log\s*out|sign\s*out|sair)(\s*)<`),
	}
	jwtPattern = regexp.MustCompile(`eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}`)
)

type SQLAuthBypassValidator struct{}

func NewSQLAuthBypassValidator() *SQLAuthBypassValidator {
	return &SQLAuthBypassValidator{}
}

func (v *SQLAuthBypassValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "SQL") {
		return nil
	}
	if !looksLikeSQLInjectionPayload(response.PayloadUsed) {
		return nil
	}
	if htmlFormLoginBypass(response) {
		return newFinding(response, "SQL payload bypassed login form into an authenticated page")
	}
	if jsonLoginBypass(response) {
		return newFinding(response, "SQL payload bypassed JSON login and returned an auth token")
	}
	return nil
}

func htmlFormLoginBypass(response types.Response) bool {
	if !passwordInputPattern.MatchString(response.BaselineBody) {
		return false
	}
	if passwordInputPattern.MatchString(response.AttackBody) {
		return false
	}
	return hasAuthSuccessMarker(response.AttackBody)
}

func jsonLoginBypass(response types.Response) bool {
	if response.AttackStatus >= 400 {
		return false
	}
	if jwtPattern.MatchString(response.AttackBody) && !jwtPattern.MatchString(response.BaselineBody) {
		return true
	}
	return jsonHasAuthToken(response.AttackBody) && !jsonHasAuthToken(response.BaselineBody)
}

func jsonHasAuthToken(body string) bool {
	lower := strings.ToLower(body)
	if !strings.Contains(lower, `"token"`) && !strings.Contains(lower, `"access_token"`) {
		return false
	}
	return strings.Contains(lower, `"authentication"`) ||
		strings.Contains(lower, `"access_token"`)
}

func looksLikeSQLInjectionPayload(payload string) bool {
	lower := strings.ToLower(payload)
	if strings.Contains(payload, "'") || strings.Contains(payload, "\"") {
		return true
	}
	if strings.Contains(lower, "--") || strings.Contains(lower, "/*") {
		return true
	}
	return strings.Contains(lower, " or ") || strings.Contains(lower, " union ")
}

func hasAuthSuccessMarker(body string) bool {
	for _, pattern := range authSuccessPatterns {
		if pattern.MatchString(body) {
			return true
		}
	}
	return false
}
