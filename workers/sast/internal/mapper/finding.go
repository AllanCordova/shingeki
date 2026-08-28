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
		AttackID:        batch.PrimaryAttackID(),
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

func findingEndLine(finding scanner.Finding) int {
	if finding.EndLine > 0 {
		return finding.EndLine
	}

	return finding.Line
}
