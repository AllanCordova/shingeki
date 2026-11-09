package dynamic

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
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
		switch {
		case location == "XML_BODY":
			if root := mergeXMLParams(vector, body); root != "" && vector.XMLRoot == "" {
				vector.XMLRoot = root
			}
		case looksLikeGraphQL(route, body):
			mergeGraphQLParams(vector, body)
		default:
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
	if strings.Contains(lowerType, "xml") || looksLikeXMLBody(body) {
		return "XML_BODY"
	}
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

func looksLikeXMLBody(body string) bool {
	trimmed := strings.TrimSpace(body)
	if trimmed == "" {
		return false
	}
	if strings.HasPrefix(strings.ToLower(trimmed), "%3c") {
		decoded, err := url.QueryUnescape(trimmed)
		if err != nil {
			return false
		}
		trimmed = strings.TrimSpace(decoded)
	}
	return strings.HasPrefix(trimmed, "<") && strings.Contains(trimmed, ">")
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

func mergeXMLParams(vector contracts.AttackVector, body string) string {
	trimmed := strings.TrimSpace(body)
	if strings.HasPrefix(strings.ToLower(trimmed), "%3c") {
		decoded, err := url.QueryUnescape(trimmed)
		if err != nil {
			return ""
		}
		trimmed = strings.TrimSpace(decoded)
	}
	decoder := xml.NewDecoder(strings.NewReader(trimmed))
	decoder.CharsetReader = func(_ string, input io.Reader) (io.Reader, error) {
		return input, nil
	}

	depth := 0
	root := ""
	current := ""
	leaf := true
	var text strings.Builder
	fields := 0
	for fields < 32 {
		token, err := decoder.Token()
		if err != nil {
			break
		}
		switch element := token.(type) {
		case xml.StartElement:
			depth++
			if depth == 1 {
				root = element.Name.Local
				if strings.EqualFold(root, "html") || strings.EqualFold(root, "body") {
					return ""
				}
				continue
			}
			if depth == 2 {
				current = element.Name.Local
				text.Reset()
				leaf = true
				continue
			}
			if depth > 2 {
				leaf = false
			}
		case xml.EndElement:
			if depth == 2 && current != "" && leaf {
				if _, exists := vector.Params[current]; !exists {
					vector.Params[current] = strings.TrimSpace(text.String())
					fields++
				}
			}
			if depth == 2 {
				current = ""
			}
			if depth > 0 {
				depth--
			}
		case xml.CharData:
			if depth == 2 && leaf {
				text.Write(element)
			}
		}
	}
	return root
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
