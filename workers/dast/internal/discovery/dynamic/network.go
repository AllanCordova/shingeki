package dynamic

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
	"github.com/shingeki/dast-worker/pkg/httputil"
)

func networkVector(targetURL, method, route, contentType, body string) (contracts.AttackVector, bool) {
	method = strings.ToUpper(strings.TrimSpace(method))
	route = strings.TrimSpace(route)
	if method == "" || route == "" {
		return contracts.AttackVector{}, false
	}
	if method == http.MethodOptions || method == http.MethodHead {
		return contracts.AttackVector{}, false
	}
	if !bfs.IsAttackableDiscoveryURL(targetURL, route) {
		return contracts.AttackVector{}, false
	}

	location := classifyTargetLocation(method, contentType, route, body)
	vector := contracts.NewAttackVector(route, method, location)
	if body != "" {
		vector.Body = httputil.Truncate(httputil.RedactBody(body), 16<<10)
		if looksLikeGraphQL(route, body) {
			mergeGraphQLParams(vector, body)
		} else {
			mergeJSONParams(vector, body)
		}
	}
	if parsed, err := url.Parse(route); err == nil {
		for key, values := range parsed.Query() {
			if len(values) > 0 {
				vector.Params[key] = values[0]
			}
		}
	}
	return vector, true
}

func classifyTargetLocation(method, contentType, route, body string) string {
	if looksLikeGraphQL(route, body) {
		return "JSON_BODY"
	}
	lowerType := strings.ToLower(contentType)
	if strings.Contains(lowerType, "application/json") {
		return "JSON_BODY"
	}
	if method == http.MethodGet {
		if parsed, err := url.Parse(route); err == nil && parsed.RawQuery != "" {
			return "QUERY_PARAMETER"
		}
		return "URL_PATH"
	}
	if strings.Contains(lowerType, "application/x-www-form-urlencoded") ||
		strings.Contains(lowerType, "multipart/form-data") {
		return "FORM"
	}
	return "API_ENDPOINT"
}

func looksLikeGraphQL(route, body string) bool {
	if strings.Contains(strings.ToLower(route), "graphql") {
		return true
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		return false
	}
	_, hasQuery := payload["query"]
	_, hasOp := payload["operationName"]
	return hasQuery || hasOp
}

func mergeJSONParams(vector contracts.AttackVector, body string) {
	var payload map[string]any
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		return
	}
	for key, value := range payload {
		vector.Params[key] = fmt.Sprintf("%v", value)
	}
}

func mergeGraphQLParams(vector contracts.AttackVector, body string) {
	var payload map[string]any
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		return
	}
	if name, ok := payload["operationName"].(string); ok && strings.TrimSpace(name) != "" {
		vector.Params["operationName"] = name
	}
	if query, ok := payload["query"].(string); ok && strings.TrimSpace(query) != "" {
		vector.Params["query"] = truncate(query, 200)
	}
	vars, _ := payload["variables"].(map[string]any)
	for key, value := range vars {
		vector.Params[key] = fmt.Sprintf("%v", value)
	}
}
