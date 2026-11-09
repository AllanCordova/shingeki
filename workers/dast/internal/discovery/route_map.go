package discovery

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
)

var routePlaceholder = regexp.MustCompile(`\{([A-Za-z0-9_.-]+)\}`)

func VectorsFromRouteMap(targetURL string, routes []contracts.DispatchRoute) ([]contracts.AttackVector, error) {
	if len(routes) == 0 {
		return nil, fmt.Errorf("route map is empty")
	}
	if len(routes) > contracts.MaxRouteMapEntries {
		return nil, fmt.Errorf("route map exceeds %d routes", contracts.MaxRouteMapEntries)
	}

	base, err := url.Parse(strings.TrimSpace(targetURL))
	if err != nil || base.Scheme == "" || base.Host == "" {
		return nil, fmt.Errorf("invalid target url %q", targetURL)
	}
	origin := &url.URL{Scheme: base.Scheme, Host: base.Host}

	vectors := make([]contracts.AttackVector, 0, len(routes))
	for i, route := range routes {
		resolved, query, err := resolveMappedRoute(origin, route)
		if err != nil {
			return nil, fmt.Errorf("route_map[%d]: %w", i, err)
		}
		if !bfs.SameOrigin(targetURL, resolved) {
			return nil, fmt.Errorf("route_map[%d]: path must stay on the target origin", i)
		}

		method, err := normalizeRouteMethod(route.Method)
		if err != nil {
			return nil, fmt.Errorf("route_map[%d]: %w", i, err)
		}

		vectors = append(vectors, contracts.NewAttackVector(resolved, method, "URL_PATH"))

		if len(query) > 0 {
			queryVector := contracts.NewAttackVector(withSortedQuery(resolved, query), method, "QUERY_PARAMETER")
			queryVector.Params = query
			vectors = append(vectors, queryVector)
		}

		body, params, hasBody, err := normalizeRouteBody(route.Body)
		if err != nil {
			return nil, fmt.Errorf("route_map[%d]: %w", i, err)
		}
		if hasBody || isWriteMethod(method) {
			bodyVector := contracts.NewAttackVector(resolved, method, "JSON_BODY")
			bodyVector.Body = body
			bodyVector.Params = params
			vectors = append(vectors, bodyVector)
		}
	}

	return vectors, nil
}

func resolveMappedRoute(origin *url.URL, route contracts.DispatchRoute) (string, map[string]string, error) {
	path := strings.TrimSpace(route.Path)
	path = strings.ReplaceAll(path, `\`, "/")
	if path == "" {
		return "", nil, fmt.Errorf("path is required")
	}
	if strings.Contains(path, "://") || strings.HasPrefix(path, "//") {
		return "", nil, fmt.Errorf("path must be relative to the target")
	}

	query := map[string]string{}
	for key, value := range route.Query {
		name := strings.TrimSpace(key)
		if name == "" {
			return "", nil, fmt.Errorf("query name is empty")
		}
		query[name] = value
	}

	if hash := strings.Index(path, "#"); hash >= 0 {
		path = path[:hash]
	}
	if separator := strings.Index(path, "?"); separator >= 0 {
		rawQuery := path[separator+1:]
		path = path[:separator]
		parsed, err := url.ParseQuery(rawQuery)
		if err != nil {
			return "", nil, fmt.Errorf("invalid query: %w", err)
		}
		for key, values := range parsed {
			if _, exists := query[key]; exists || len(values) == 0 {
				continue
			}
			query[key] = values[0]
		}
	}

	path, err := substituteRoutePlaceholders(path, query)
	if err != nil {
		return "", nil, err
	}
	if strings.ContainsAny(path, "{}") {
		return "", nil, fmt.Errorf("path still has unsubstituted placeholders")
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	for _, segment := range strings.Split(strings.Trim(path, "/"), "/") {
		if segment == "." || segment == ".." {
			return "", nil, fmt.Errorf("path must not contain . or .. segments")
		}
	}

	ref, err := url.Parse(path)
	if err != nil {
		return "", nil, fmt.Errorf("invalid path: %w", err)
	}
	resolved := origin.ResolveReference(ref)
	resolved.Fragment = ""
	resolved.RawQuery = ""
	if resolved.Host != origin.Host || !strings.EqualFold(resolved.Scheme, origin.Scheme) {
		return "", nil, fmt.Errorf("path must stay on the target origin")
	}

	return resolved.String(), query, nil
}

func substituteRoutePlaceholders(path string, query map[string]string) (string, error) {
	var replaceErr error
	replaced := routePlaceholder.ReplaceAllStringFunc(path, func(match string) string {
		if replaceErr != nil {
			return match
		}
		parts := routePlaceholder.FindStringSubmatch(match)
		if len(parts) != 2 {
			replaceErr = fmt.Errorf("invalid placeholder %s", match)
			return match
		}
		value, ok := query[parts[1]]
		if !ok || value == "" {
			replaceErr = fmt.Errorf("missing value for {%s}", parts[1])
			return match
		}
		if invalidPlaceholderValue(value) {
			replaceErr = fmt.Errorf("invalid value for {%s}", parts[1])
			return match
		}
		delete(query, parts[1])
		return url.PathEscape(value)
	})
	if replaceErr != nil {
		return "", replaceErr
	}
	return replaced, nil
}

func invalidPlaceholderValue(value string) bool {
	return strings.Contains(value, "..") ||
		strings.Contains(value, "/") ||
		strings.Contains(value, `\`) ||
		strings.ContainsAny(value, "\r\n")
}

func normalizeRouteMethod(method string) (string, error) {
	method = strings.ToUpper(strings.TrimSpace(method))
	if method == "" {
		return http.MethodGet, nil
	}
	switch method {
	case http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodHead, http.MethodOptions:
		return method, nil
	default:
		return "", fmt.Errorf("invalid method %q", method)
	}
}

func isWriteMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

func normalizeRouteBody(raw json.RawMessage) (string, map[string]string, bool, error) {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
		return "", nil, false, nil
	}
	if trimmed[0] != '{' {
		return "", nil, false, fmt.Errorf("body must be a JSON object")
	}

	var generic map[string]any
	if err := json.Unmarshal(trimmed, &generic); err != nil {
		return "", nil, false, fmt.Errorf("body must be a JSON object")
	}
	if len(generic) == 0 {
		return "", nil, false, nil
	}

	params := map[string]string{}
	for key, value := range generic {
		switch typed := value.(type) {
		case string:
			params[key] = typed
		case float64:
			params[key] = strconv.FormatFloat(typed, 'f', -1, 64)
		case bool:
			params[key] = strconv.FormatBool(typed)
		}
	}

	compact, err := json.Marshal(generic)
	if err != nil {
		return "", nil, false, fmt.Errorf("encode body: %w", err)
	}
	return string(compact), params, true, nil
}

func withSortedQuery(raw string, query map[string]string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	keys := make([]string, 0, len(query))
	for key := range query {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	values := url.Values{}
	for _, key := range keys {
		values.Set(key, query[key])
	}
	parsed.RawQuery = values.Encode()
	return parsed.String()
}
