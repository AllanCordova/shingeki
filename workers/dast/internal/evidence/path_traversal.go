package evidence

import (
	"context"
	"net/http"
	"net/url"
	"path"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

// Classic LFI / file-read markers that are extremely unlikely in normal HTML pages.
var pathTraversalMarkers = []string{
	"root:x:0:0:",
	"daemon:x:1:1:",
	"lab-secret:",
	"[extensions]",
	"[fonts]",
	"for 16-bit app support",
	"this document is confidential!",
	"planned acquisitions",
}

type PathTraversalValidator struct{}

func NewPathTraversalValidator() *PathTraversalValidator {
	return &PathTraversalValidator{}
}

func (v *PathTraversalValidator) Analyze(_ context.Context, response types.Response) *Finding {
	category := strings.ToUpper(response.Job.Attack.Category)
	if !strings.Contains(category, "PATH") {
		return nil
	}

	attackBody := response.AttackBody
	baselineBody := response.BaselineBody
	attackLower := strings.ToLower(attackBody)
	baselineLower := strings.ToLower(baselineBody)

	for _, marker := range pathTraversalMarkers {
		markerLower := strings.ToLower(marker)
		if strings.Contains(attackLower, markerLower) && !strings.Contains(baselineLower, markerLower) {
			return newFinding(response, "path traversal file content marker found in attack response")
		}
	}

	// The payload filename in the body is not file content when the server only
	// echoes the request path (404 "route could not be found", debug stack trace).
	base := path.Base(strings.ReplaceAll(response.PayloadUsed, "\\", "/"))
	base = strings.TrimSpace(base)
	if base != "" && base != "." && base != ".." && confirmsLeakedFilename(response, base, baselineLower) {
		return newFinding(response, "path traversal payload target content leaked in response")
	}

	return nil
}

func confirmsLeakedFilename(response types.Response, base, baselineLower string) bool {
	if response.AttackStatus == http.StatusNotFound || response.AttackStatus == http.StatusMethodNotAllowed {
		return false
	}
	if !looksLikeLeakedFile(response.AttackBody) {
		return false
	}
	baseLower := strings.ToLower(base)
	if strings.Contains(baselineLower, baseLower) {
		return false
	}
	return basenameSurvivesReflection(response.AttackBody, response.PayloadUsed, response.RawRequest, baseLower)
}

// basenameSurvivesReflection reports whether the payload filename still appears
// after echoed request paths are removed. A routing error that quotes
// /api/v1/%2e%2e%2fstorage%2fsecret.txt contains "secret.txt" only as that echo.
func basenameSurvivesReflection(body, payload, rawRequest, baseLower string) bool {
	normalized := normalizeReflectedBody(body)
	for _, form := range reflectionForms(payload, rawRequest) {
		formLower := strings.ToLower(form)
		if len(formLower) <= len(baseLower) {
			continue
		}
		normalized = strings.ReplaceAll(normalized, formLower, "")
	}
	return strings.Contains(normalized, baseLower)
}

func normalizeReflectedBody(body string) string {
	lower := strings.ToLower(body)
	lower = strings.ReplaceAll(lower, `\/`, "/")
	lower = strings.ReplaceAll(lower, `\u002f`, "/")
	lower = strings.ReplaceAll(lower, `\u002e`, ".")
	return lower
}

func reflectionForms(payload, rawRequest string) []string {
	var forms []string
	seen := map[string]struct{}{}
	add := func(value string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		if _, ok := seen[value]; ok {
			return
		}
		seen[value] = struct{}{}
		forms = append(forms, value)
	}

	add(payload)
	slash := strings.ReplaceAll(payload, `\`, "/")
	add(slash)
	add(encodeTraversalPayload(slash))
	add(url.PathEscape(slash))
	add(url.QueryEscape(slash))

	target := requestTarget(rawRequest)
	add(target)
	if target != "" {
		if parsed, err := url.Parse(target); err == nil {
			add(parsed.EscapedPath())
			add(parsed.Path)
			add(parsed.RawPath)
			if parsed.RawQuery != "" {
				add(parsed.EscapedPath() + "?" + parsed.RawQuery)
			}
		}
	}
	return forms
}

func encodeTraversalPayload(payload string) string {
	payload = strings.ReplaceAll(payload, `\`, "/")
	payload = strings.ReplaceAll(payload, "..", "%2e%2e")
	return strings.ReplaceAll(payload, "/", "%2f")
}

func requestTarget(rawRequest string) string {
	fields := strings.Fields(rawRequest)
	for i, field := range fields {
		if i == 0 && !strings.Contains(field, "/") {
			continue
		}
		if strings.Contains(field, "/") {
			return field
		}
	}
	return ""
}

func looksLikeLeakedFile(body string) bool {
	trimmed := strings.TrimSpace(body)
	if trimmed == "" {
		return false
	}
	lower := strings.ToLower(trimmed)
	// SPA / marketing HTML is the common false-positive surface.
	if strings.Contains(lower, "<html") || strings.Contains(lower, "<!doctype") {
		return false
	}
	if strings.Count(lower, "<script") > 0 || strings.Count(lower, "<div") > 3 {
		return false
	}
	if isFrameworkErrorBody(lower) {
		return false
	}
	return true
}

// isFrameworkErrorBody matches routing and debug documents that quote the
// request URL. Those pages are error detail, not a read of the targeted file.
func isFrameworkErrorBody(lower string) bool {
	if strings.Contains(lower, "could not be found") ||
		strings.Contains(lower, "notfoundhttpexception") ||
		strings.Contains(lower, "no route found") ||
		strings.Contains(lower, "route not found") {
		return true
	}
	hasException := strings.Contains(lower, "exception") || strings.Contains(lower, "stack trace") || strings.Contains(lower, "stacktrace")
	hasTrace := strings.Contains(lower, `"trace"`) || strings.Contains(lower, "stack trace") || strings.Contains(lower, "stacktrace") || strings.Contains(lower, "#0 ")
	return hasException && hasTrace
}
