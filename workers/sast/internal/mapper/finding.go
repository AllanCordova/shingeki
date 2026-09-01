package mapper

import (
	"fmt"
	"strings"

	"github.com/shingeki/sast-worker/internal/contracts"
	"github.com/shingeki/sast-worker/internal/scanner"
)

func ToResultMessage(
	batch contracts.DispatchBatch,
	finding scanner.Finding,
	repoDir string,
) contracts.ResultMessage {
	relativePath := relativizePath(finding.Path, repoDir)

	evidence := finding.Message
	if finding.Snippet != "" {
		evidence = fmt.Sprintf("%s\n\n%s", finding.Message, finding.Snippet)
	}

	route := relativePath
	if finding.Line > 0 {
		route = fmt.Sprintf("%s:%d", relativePath, finding.Line)
	}

	context := fmt.Sprintf("file: %s", relativePath)
	if finding.Snippet != "" {
		context = fmt.Sprintf("%s\n%s", context, finding.Snippet)
	}

	return contracts.ResultMessage{
		DispatchID:      batch.DispatchID,
		AttackID:        AttackIDForFinding(batch, finding),
		SystemID:        batch.SystemID,
		VulnerableRoute: route,
		PayloadUsed:     finding.CheckID,
		Evidence:        strings.TrimSpace(evidence),
		HTTPRequest:     strings.TrimSpace(context),
		SourceFile:      relativePath,
		StartLine:       finding.Line,
		EndLine:         findingEndLine(finding),
		MatchedSnippet:  finding.Snippet,
	}
}

func AttackIDForFinding(batch contracts.DispatchBatch, finding scanner.Finding) string {
	if len(batch.Attacks) == 0 {
		return ""
	}
	if len(batch.Attacks) == 1 {
		return batch.Attacks[0].AttackID
	}

	check := strings.ToLower(finding.CheckID)
	path := strings.ToLower(finding.Path)
	bestID := batch.Attacks[0].AttackID
	bestScore := 0

	for _, attack := range batch.Attacks {
		score := 0
		for _, lang := range attack.PayloadLanguages() {
			lang = strings.ToLower(strings.TrimSpace(lang))
			if lang == "" {
				continue
			}
			if strings.Contains(check, lang) || languageMatchesPath(lang, path) {
				score += 2
			}
		}
		category := normalizeCategory(attack.Category)
		if category != "" && strings.Contains(check, category) {
			score += 3
		}
		if score > bestScore {
			bestScore = score
			bestID = attack.AttackID
		}
	}

	return bestID
}

func normalizeCategory(category string) string {
	category = strings.ToLower(strings.TrimSpace(category))
	category = strings.ReplaceAll(category, "_", "-")
	return category
}

func languageMatchesPath(language, path string) bool {
	switch language {
	case "php":
		return strings.HasSuffix(path, ".php")
	case "javascript", "js":
		return strings.HasSuffix(path, ".js") || strings.HasSuffix(path, ".jsx") || strings.HasSuffix(path, ".mjs")
	case "typescript", "ts":
		return strings.HasSuffix(path, ".ts") || strings.HasSuffix(path, ".tsx")
	default:
		return false
	}
}

func findingEndLine(finding scanner.Finding) int {
	if finding.EndLine > 0 {
		return finding.EndLine
	}

	return finding.Line
}
