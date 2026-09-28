package discovery

import (
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

var (
	usableBasketPath = regexp.MustCompile(`(?i)/rest/basket/[1-9][0-9]*/?$`)
	usableUsersPath  = regexp.MustCompile(`(?i)/api/users(/[1-9][0-9]*)?/?$`)
)

func AppendSPAAuthenticatedVectors(targetURL string, vectors []contracts.AttackVector, auth *contracts.TargetAuth) []contracts.AttackVector {
	if len(vectors) == 0 {
		return vectors
	}
	if len(contracts.EffectiveAuthHeaders(auth)) == 0 {
		return vectors
	}
	if !hasRESTHint(vectors) {
		return vectors
	}

	origin := targeturl.Origin(targetURL)
	if origin == "" {
		return vectors
	}

	hasBasket1, hasBasket2, hasUsers, hasReviews := false, false, false, false
	for _, vector := range vectors {
		if isUsableBasketVector(vector) {
			path := strings.ToLower(routePath(vector.Route))
			if strings.HasSuffix(path, "/1") || strings.HasSuffix(path, "/1/") {
				hasBasket1 = true
			}
			if strings.HasSuffix(path, "/2") || strings.HasSuffix(path, "/2/") {
				hasBasket2 = true
			}
		}
		if isUsableUsersVector(vector) {
			hasUsers = true
		}
		if isUsableReviewVector(vector) {
			hasReviews = true
		}
	}

	if !hasBasket1 {
		vectors = append(vectors, contracts.NewAttackVector(targeturl.RESTBasketURL(origin, "1"), http.MethodGet, "URL_PATH"))
	}
	if !hasBasket2 {
		vectors = append(vectors, contracts.NewAttackVector(targeturl.RESTBasketURL(origin, targeturl.ForeignBasketID("1")), http.MethodGet, "URL_PATH"))
	}
	if !hasUsers {
		vectors = append(vectors, contracts.NewAttackVector(targeturl.APIUsersURL(origin), http.MethodGet, "URL_PATH"))
	}
	if !hasReviews {
		review := contracts.NewAttackVector(targeturl.ProductReviewsURL(origin, "1"), http.MethodPut, "JSON_BODY")
		review.Params["message"] = ""
		review.Params["author"] = ""
		body, _ := json.Marshal(map[string]string{"message": "", "author": ""})
		review.Body = string(body)
		vectors = append(vectors, review)
	}
	return vectors
}

func routePath(route string) string {
	parsed, err := url.Parse(route)
	if err != nil || parsed.Path == "" {
		if idx := strings.Index(route, "?"); idx >= 0 {
			route = route[:idx]
		}
		return route
	}
	return parsed.Path
}

func isUsableBasketVector(vector contracts.AttackVector) bool {
	if vector.TargetLocation != "URL_PATH" {
		return false
	}
	return usableBasketPath.MatchString(routePath(vector.Route))
}

func isUsableUsersVector(vector contracts.AttackVector) bool {
	if vector.TargetLocation != "URL_PATH" {
		return false
	}
	return usableUsersPath.MatchString(routePath(vector.Route))
}

func isUsableReviewVector(vector contracts.AttackVector) bool {
	method := strings.ToUpper(vector.Method)
	if method != http.MethodPut && method != http.MethodPatch {
		return false
	}
	if vector.TargetLocation != "JSON_BODY" && vector.TargetLocation != "API_ENDPOINT" {
		return false
	}
	if !strings.Contains(strings.ToLower(routePath(vector.Route)), "/reviews") {
		return false
	}
	if _, ok := vector.Params["author"]; ok {
		return true
	}
	return strings.Contains(strings.ToLower(vector.Body), `"author"`)
}

func hasRESTHint(vectors []contracts.AttackVector) bool {
	for _, vector := range vectors {
		if targeturl.LooksLikeRestAPI(vector.Route) || targeturl.LooksLikeHashRouter(vector.Route) {
			return true
		}
		if strings.Contains(strings.ToLower(vector.Route), "/api/") {
			return true
		}
	}
	return false
}
