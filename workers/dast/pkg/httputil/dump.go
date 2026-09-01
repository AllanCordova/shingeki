package httputil

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
)

var sensitiveHeaderNames = map[string]struct{}{
	"authorization":        {},
	"cookie":               {},
	"set-cookie":           {},
	"proxy-authorization":  {},
	"x-api-key":            {},
	"api-key":              {},
	"x-auth-token":         {},
	"x-access-token":       {},
	"x-csrf-token":         {},
	"x-xsrf-token":         {},
	"x-amz-security-token": {},
}

var sensitiveFieldNames = map[string]struct{}{
	"password":      {},
	"passwd":        {},
	"pass":          {},
	"secret":        {},
	"token":         {},
	"access_token":  {},
	"refresh_token": {},
	"id_token":      {},
	"api_key":       {},
	"apikey":        {},
	"authorization": {},
	"session":       {},
	"jwt":           {},
	"credit_card":   {},
	"card_number":   {},
	"cvv":           {},
	"ssn":           {},
}

func DumpRequest(method, rawURL string, headers map[string]string, body string) string {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("%s %s HTTP/1.1\r\n", method, redactURL(rawURL)))

	keys := make([]string, 0, len(headers))
	for k := range headers {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		value := headers[k]
		if isSensitiveHeader(k) {
			value = "[REDACTED]"
		}
		b.WriteString(fmt.Sprintf("%s: %s\r\n", k, value))
	}
	b.WriteString("\r\n")
	if body != "" {
		b.WriteString(RedactBody(body))
	}
	return b.String()
}

func CheckSameOriginRedirect(req *http.Request, via []*http.Request) error {
	const maxRedirects = 5
	if len(via) >= maxRedirects {
		return fmt.Errorf("stopped after %d redirects", maxRedirects)
	}
	if len(via) == 0 {
		return nil
	}
	origin := via[0].URL
	if !strings.EqualFold(origin.Scheme, req.URL.Scheme) || !strings.EqualFold(origin.Host, req.URL.Host) {
		return http.ErrUseLastResponse
	}
	return nil
}

func Truncate(body string, max int) string {
	if max <= 0 || len(body) <= max {
		return body
	}
	for max > 0 && !isUTF8RuneStart(body[max]) {
		max--
	}
	return body[:max]
}

func RedactBody(body string) string {
	trimmed := strings.TrimSpace(body)
	if trimmed == "" {
		return body
	}
	if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
		var payload any
		if err := json.Unmarshal([]byte(trimmed), &payload); err == nil {
			redacted, err := json.Marshal(redactJSON(payload))
			if err == nil {
				return string(redacted)
			}
		}
	}
	if strings.Contains(trimmed, "=") && !strings.Contains(trimmed, "{") {
		values, err := url.ParseQuery(trimmed)
		if err == nil && len(values) > 0 {
			for key := range values {
				if isSensitiveField(key) {
					values.Set(key, "[REDACTED]")
				}
			}
			return values.Encode()
		}
	}
	return body
}

func redactURL(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.RawQuery == "" {
		return rawURL
	}
	query := parsed.Query()
	changed := false
	for key := range query {
		if isSensitiveField(key) {
			query.Set(key, "[REDACTED]")
			changed = true
		}
	}
	if !changed {
		return rawURL
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func redactJSON(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, nested := range typed {
			if isSensitiveField(key) {
				out[key] = "[REDACTED]"
				continue
			}
			out[key] = redactJSON(nested)
		}
		return out
	case []any:
		out := make([]any, len(typed))
		for i, nested := range typed {
			out[i] = redactJSON(nested)
		}
		return out
	default:
		return value
	}
}

func isSensitiveHeader(name string) bool {
	_, ok := sensitiveHeaderNames[strings.ToLower(name)]
	return ok
}

func isSensitiveField(name string) bool {
	normalized := strings.ToLower(strings.TrimSpace(name))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	_, ok := sensitiveFieldNames[normalized]
	return ok
}

func isUTF8RuneStart(b byte) bool {
	return b&0xC0 != 0x80
}
