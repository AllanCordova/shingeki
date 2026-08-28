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
	if !passwordInputPattern.MatchString(response.BaselineBody) {
		return nil
	}
	if passwordInputPattern.MatchString(response.AttackBody) {
		return nil
	}
	if !hasAuthSuccessMarker(response.AttackBody) {
		return nil
	}
	return newFinding(response, "SQL payload bypassed login form into an authenticated page")
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
