package evidence

import (
	"context"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

var nosqlErrorNeedles = []string{
	"mongodb",
	"bson",
	"mongoerror",
	"cast to objectid failed",
}

type NoSQLValidator struct{}

func NewNoSQLValidator() *NoSQLValidator {
	return &NoSQLValidator{}
}

func (v *NoSQLValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "NOSQL") {
		return nil
	}
	if jsonLoginBypass(response) {
		return newFinding(response, "NoSQL payload bypassed JSON login and returned an auth token")
	}
	body := strings.ToLower(capBody(response.AttackBody))
	base := strings.ToLower(capBody(response.BaselineBody))
	for _, needle := range nosqlErrorNeedles {
		if strings.Contains(body, needle) && !strings.Contains(base, needle) && response.AttackStatus >= 500 {
			return newFinding(response, "NoSQL operator error signature detected in response body")
		}
	}
	return nil
}
