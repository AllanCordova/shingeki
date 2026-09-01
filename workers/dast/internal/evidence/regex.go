package evidence

import (
	"context"
	"html"
	"regexp"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

const regexBodyCap = 64 << 10

var sqlErrorNeedles = []string{
	"sql syntax",
	"mysql_fetch",
	"unclosed quotation mark",
	"sqlstate[",
	"unrecognized token",
	"unterminated quoted string",
	"unterminated string",
	"sqlite/jdbcdriver",
	"sqlite_error",
	"sqlite3",
	"sequelize",
	"incomplete input",
}

var sqlErrorPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)ORA-\d{5}`),
}

type RegexValidator struct{}

func NewRegexValidator() *RegexValidator {
	return &RegexValidator{}
}

func (v *RegexValidator) Analyze(_ context.Context, response types.Response) *Finding {
	body := strings.ToLower(capBody(response.AttackBody))
	category := response.Job.Attack.Category

	if strings.Contains(strings.ToUpper(category), "SQL") {
		if sqlErrorIn(body) {
			return newFinding(response, "SQL error signature detected in response body")
		}
		if sqlErrorStatus(response) {
			return newFinding(response, "SQL payload triggered a server error against a healthy baseline")
		}
	}

	if strings.Contains(strings.ToUpper(category), "XSS") {
		if unescapedReflection(response.AttackBody, response.PayloadUsed) {
			return newFinding(response, "unescaped payload reflected in response body")
		}
	}

	return nil
}

func sqlErrorIn(body string) bool {
	for _, needle := range sqlErrorNeedles {
		if strings.Contains(body, needle) {
			return true
		}
	}
	if strings.Contains(body, "postgresql") && strings.Contains(body, "error") {
		return true
	}
	if strings.Contains(body, "near '") && strings.Contains(body, "syntax error") {
		return true
	}
	if strings.Contains(body, `near "`) && strings.Contains(body, "syntax error") {
		return true
	}
	if strings.Contains(body, `near \"`) && strings.Contains(body, "syntax error") {
		return true
	}
	for _, pattern := range sqlErrorPatterns {
		if pattern.MatchString(body) {
			return true
		}
	}
	return false
}

func sqlErrorStatus(response types.Response) bool {
	if response.AttackStatus < 500 {
		return false
	}
	if response.BaselineStatus == 0 || response.BaselineStatus >= 400 {
		return false
	}
	return looksLikeSQLInjectionPayload(response.PayloadUsed)
}

func unescapedReflection(body, payload string) bool {
	if payload == "" || !strings.Contains(body, payload) {
		return false
	}
	encoded := html.EscapeString(payload)
	if payload != encoded && strings.Contains(body, encoded) && !strings.Contains(strings.ToLower(body), strings.ToLower(payload)) {
		return false
	}
	if payload != encoded && !strings.Contains(body, payload) {
		return false
	}
	return true
}

func capBody(body string) string {
	if len(body) <= regexBodyCap {
		return body
	}
	return body[:regexBodyCap]
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
