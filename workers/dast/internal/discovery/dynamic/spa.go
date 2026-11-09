package dynamic

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func queryVectorFromPageURL(raw string) (contracts.AttackVector, bool) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return contracts.AttackVector{}, false
	}
	params := map[string]string{}
	for key, values := range parsed.Query() {
		if len(values) > 0 {
			params[key] = values[0]
		}
	}
	if _, fragQuery, ok := targeturl.SplitFragment(parsed.Fragment); ok {
		for key, values := range fragQuery {
			if len(values) > 0 {
				params[key] = values[0]
			}
		}
	}
	if len(params) == 0 {
		return contracts.AttackVector{}, false
	}
	vector := contracts.NewAttackVector(raw, http.MethodGet, "QUERY_PARAMETER")
	vector.Params = params
	return vector, true
}
