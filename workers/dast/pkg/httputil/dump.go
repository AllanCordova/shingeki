package httputil

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
)

var sensitiveHeaderNames = map[string]struct{}{
	"authorization":       {},
	"cookie":              {},
	"set-cookie":          {},
	"proxy-authorization": {},
	"x-api-key":           {},
	"x-auth-token":        {},
	"x-access-token":      {},
}

func DumpRequest(method, rawURL string, headers map[string]string, body string) string {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("%s %s HTTP/1.1\r\n", method, rawURL))

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
		b.WriteString(body)
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

func isSensitiveHeader(name string) bool {
	_, ok := sensitiveHeaderNames[strings.ToLower(name)]
	return ok
}

func isUTF8RuneStart(b byte) bool {
	return b&0xC0 != 0x80
}
