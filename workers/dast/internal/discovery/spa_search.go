package discovery

import (
	"net/http"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func AppendSPASearchVectors(targetURL string, vectors []contracts.AttackVector) []contracts.AttackVector {
	if len(vectors) == 0 {
		return vectors
	}

	hasHashRouter := false
	hasSearchAPI := false
	for _, vector := range vectors {
		if targeturl.LooksLikeHashRouter(vector.Route) {
			hasHashRouter = true
		}
		if targeturl.LooksLikeSearchQueryRoute(vector.Route) {
			hasSearchAPI = true
		}
	}
	if !hasHashRouter || !hasSearchAPI {
		return vectors
	}

	route := targeturl.HashSearchURL(targetURL)
	if route == "" {
		return vectors
	}
	for _, vector := range vectors {
		if strings.Contains(vector.Route, "/#/search") && vector.TargetLocation == "QUERY_PARAMETER" {
			return vectors
		}
	}

	vector := contracts.NewAttackVector(route, http.MethodGet, "QUERY_PARAMETER")
	vector.Params["q"] = ""
	return append(vectors, vector)
}
