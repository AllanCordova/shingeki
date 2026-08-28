package evidence

import (
	"context"
	"regexp"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

var sqlErrorPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)sql syntax`),
	regexp.MustCompile(`(?i)mysql_fetch`),
	regexp.MustCompile(`(?i)ORA-\d{5}`),
	regexp.MustCompile(`(?i)PostgreSQL.*ERROR`),
	regexp.MustCompile(`(?i)SQLite/JDBCDriver`),
	regexp.MustCompile(`(?i)Unclosed quotation mark`),
	regexp.MustCompile(`(?i)SQLSTATE\[`),
	regexp.MustCompile(`(?i)unrecognized token`),
	regexp.MustCompile(`(?i)unterminated (quoted )?string`),
	regexp.MustCompile(`(?i)near ["'].+["']: syntax error`),
}

type RegexValidator struct{}

func NewRegexValidator() *RegexValidator {
	return &RegexValidator{}
}

func (v *RegexValidator) Analyze(_ context.Context, response types.Response) *Finding {
	body := strings.ToLower(response.AttackBody)
	category := response.Job.Attack.Category

	for _, pattern := range sqlErrorPatterns {
		if pattern.MatchString(body) && strings.Contains(strings.ToUpper(category), "SQL") {
			return newFinding(response, "SQL error signature detected in response body")
		}
	}

	if strings.Contains(strings.ToUpper(category), "XSS") {
		payload := strings.ToLower(response.PayloadUsed)
		if payload != "" && strings.Contains(body, payload) {
			return newFinding(response, "payload reflected in response body")
		}
	}

	return nil
}

func newFinding(response types.Response, evidence string) *Finding {
	return &Finding{
		AttackID:        response.Job.Attack.AttackID,
		VulnerableRoute: response.Job.Vector.Route,
		PayloadUsed:     response.PayloadUsed,
		Evidence:        evidence,
		HTTPRequest:     response.RawRequest,
	}
}
