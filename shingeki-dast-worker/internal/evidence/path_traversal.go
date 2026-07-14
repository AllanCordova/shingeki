package evidence

import (
	"context"
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

	// Filename from payload appearing as text content is weak alone; require it only when
	// the response also looks like a leaked text file (plain / etc-like), not SPA HTML.
	base := path.Base(strings.ReplaceAll(response.PayloadUsed, "\\", "/"))
	base = strings.TrimSpace(base)
	if base != "" && base != "." && base != ".." {
		baseLower := strings.ToLower(base)
		if strings.Contains(attackLower, baseLower) &&
			!strings.Contains(baselineLower, baseLower) &&
			looksLikeLeakedFile(attackBody) {
			return newFinding(response, "path traversal payload target content leaked in response")
		}
	}

	return nil
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
	return true
}
