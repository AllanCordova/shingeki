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
) contracts.ResultMessage {
	evidence := finding.Message
	if finding.Snippet != "" {
		evidence = fmt.Sprintf("%s\n\n%s", finding.Message, finding.Snippet)
	}

	route := finding.Path
	if finding.Line > 0 {
		route = fmt.Sprintf("%s:%d", finding.Path, finding.Line)
	}

	context := fmt.Sprintf("file: %s", finding.Path)
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
	}
}
