package evidence

import (
	"context"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

var commandOutputNeedles = []string{
	"uid=",
	"gid=",
	"groups=",
	"root:x:0:0:",
	"windows ip configuration",
	"volume serial number",
}

type CommandValidator struct{}

func NewCommandValidator() *CommandValidator {
	return &CommandValidator{}
}

func (v *CommandValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "COMMAND") {
		return nil
	}
	attack := strings.ToLower(capBody(response.AttackBody))
	baseline := strings.ToLower(capBody(response.BaselineBody))
	for _, needle := range commandOutputNeedles {
		if strings.Contains(attack, needle) && !strings.Contains(baseline, needle) {
			return newFinding(response, "command injection output marker found in response body")
		}
	}
	return nil
}
