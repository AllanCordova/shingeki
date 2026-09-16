package discovery

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func AppendSPALoginVectors(targetURL string, vectors []contracts.AttackVector) []contracts.AttackVector {
	if len(vectors) == 0 {
		return vectors
	}

	hasHint := false
	for _, vector := range vectors {
		if targeturl.LooksLikeHashRouter(vector.Route) || targeturl.LooksLikeRestAPI(vector.Route) {
			hasHint = true
		}
		if looksLikeJSONLoginVector(vector) {
			return vectors
		}
	}
	if !hasHint {
		return vectors
	}

	route := targeturl.JSONLoginURL(targetURL)
	if route == "" {
		return vectors
	}

	body, _ := json.Marshal(map[string]string{"email": "", "password": "x"})
	vector := contracts.NewAttackVector(route, http.MethodPost, "JSON_BODY")
	vector.Params["email"] = ""
	vector.Params["password"] = "x"
	vector.Body = string(body)
	return append(vectors, vector)
}

func looksLikeJSONLoginVector(vector contracts.AttackVector) bool {
	if vector.TargetLocation != "JSON_BODY" && vector.TargetLocation != "API_ENDPOINT" {
		return false
	}
	path := strings.ToLower(vector.Route)
	if parsed, err := url.Parse(vector.Route); err == nil {
		path = strings.ToLower(parsed.Path)
	}
	return strings.Contains(path, "login") || strings.Contains(path, "signin")
}
