package discovery

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func AppendRecordedRoutes(targetURL string, vectors []contracts.AttackVector, auth *contracts.TargetAuth) []contracts.AttackVector {
	if auth == nil || len(auth.Routes) == 0 {
		return vectors
	}

	seen := make(map[string]struct{}, len(vectors)+len(auth.Routes))
	for _, vector := range vectors {
		seen[vector.Method+" "+vector.Route] = struct{}{}
	}

	out := vectors
	for _, route := range auth.Routes {
		method := strings.ToUpper(strings.TrimSpace(route.Method))
		rawURL := targeturl.Normalize(strings.TrimSpace(route.URL))
		if method == "" {
			method = http.MethodGet
		}
		if rawURL == "" || !bfs.IsAttackableDiscoveryURL(targetURL, rawURL) {
			continue
		}
		key := method + " " + rawURL
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		vector := contracts.NewAttackVector(rawURL, method, recordedLocation(method, rawURL, route.Type))
		if parsed, err := url.Parse(rawURL); err == nil {
			for name, values := range parsed.Query() {
				if len(values) > 0 {
					vector.Params[name] = values[0]
				}
			}
		}
		seedLoginJSONParams(&vector)
		out = append(out, vector)
	}
	return out
}

func recordedLocation(method, route, kind string) string {
	kind = strings.ToLower(strings.TrimSpace(kind))
	if strings.Contains(strings.ToLower(route), "graphql") {
		return "JSON_BODY"
	}
	if kind == "xmlhttprequest" || kind == "fetch" {
		if method == http.MethodGet {
			if parsed, err := url.Parse(route); err == nil && parsed.RawQuery != "" {
				return "QUERY_PARAMETER"
			}
			return "API_ENDPOINT"
		}
		return "API_ENDPOINT"
	}
	if method == http.MethodGet {
		return "URL_PATH"
	}
	return "API_ENDPOINT"
}

func seedLoginJSONParams(vector *contracts.AttackVector) {
	if vector == nil {
		return
	}
	if vector.TargetLocation != "API_ENDPOINT" && vector.TargetLocation != "JSON_BODY" {
		return
	}
	if len(vector.Params) > 0 {
		return
	}
	path := strings.ToLower(vector.Route)
	if parsed, err := url.Parse(vector.Route); err == nil {
		path = strings.ToLower(parsed.Path)
	}
	if !strings.Contains(path, "login") &&
		!strings.Contains(path, "signin") &&
		!strings.Contains(path, "sign-in") &&
		!strings.Contains(path, "/session") {
		return
	}
	if vector.Params == nil {
		vector.Params = map[string]string{}
	}
	vector.Params["email"] = ""
	vector.Params["password"] = ""
}
