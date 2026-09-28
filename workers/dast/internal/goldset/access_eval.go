package goldset

import (
	"context"
	"fmt"

	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func EvaluateAccess(ctx context.Context, origin string) (Report, error) {
	origin = targeturl.Origin(origin)
	if origin == "" {
		return Report{}, fmt.Errorf("invalid fixture origin")
	}
	vectors, catalogs := AccessCatalogJobs(origin)
	if len(vectors) != len(catalogs) {
		return Report{}, fmt.Errorf("access goldset pairs mismatch")
	}
	pairs := make([]jobPair, 0, len(vectors))
	for i := range vectors {
		pairs = append(pairs, jobPair{vectors: vectors[i], catalog: catalogs[i]})
	}
	return executeJobs(ctx, origin, mapPairs(newHarnessEngine(), pairs), ExpectedAccessChallenges(), ClassifyAccess)
}
