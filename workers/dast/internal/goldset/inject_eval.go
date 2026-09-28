package goldset

import (
	"context"
	"fmt"

	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func EvaluateInject(ctx context.Context, origin string) (Report, error) {
	origin = targeturl.Origin(origin)
	if origin == "" {
		return Report{}, fmt.Errorf("invalid fixture origin")
	}
	return executeJobs(ctx, origin, mapPairs(newHarnessEngine(), InjectJobPairs(origin)), ExpectedInjectChallenges(), ClassifyInject)
}
