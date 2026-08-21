package dynamic

import (
	"net/url"
	"strings"

	"github.com/go-rod/rod/lib/proto"
)

// cookieParamsFromAuth builds Network cookie params from a Cookie request header
// so Chromium applies session credentials on Navigate.
//
// Prefer URL-scoped cookies (no forced Domain/HTTPOnly): forcing those attributes
// can leave the jar empty after SetCookies in Rod/CDP.
func cookieParamsFromAuth(seedURL string, authHeaders map[string]string) []*proto.NetworkCookieParam {
	raw := cookieHeaderValue(authHeaders)
	if raw == "" {
		return nil
	}

	parsed, err := url.Parse(seedURL)
	if err != nil || parsed.Scheme == "" || parsed.Hostname() == "" {
		return nil
	}

	pairs := splitCookieHeader(raw)
	if len(pairs) == 0 {
		return nil
	}

	host := strings.ToLower(parsed.Hostname())
	secure := strings.EqualFold(parsed.Scheme, "https")
	origin := parsed.Scheme + "://" + host + "/"

	out := make([]*proto.NetworkCookieParam, 0, len(pairs))
	for _, pair := range pairs {
		param := &proto.NetworkCookieParam{
			Name:  pair.name,
			Value: pair.value,
			URL:   origin,
			Path:  "/",
		}
		if secure {
			param.Secure = true
			param.SameSite = proto.NetworkCookieSameSiteLax
		}
		out = append(out, param)
	}
	return out
}

func cookieHeaderValue(authHeaders map[string]string) string {
	for key, value := range authHeaders {
		if strings.EqualFold(strings.TrimSpace(key), "Cookie") {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

type cookiePair struct {
	name  string
	value string
}

func splitCookieHeader(raw string) []cookiePair {
	parts := strings.Split(raw, ";")
	out := make([]cookiePair, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		name, value, ok := strings.Cut(part, "=")
		name = strings.TrimSpace(name)
		if !ok || name == "" {
			continue
		}
		out = append(out, cookiePair{name: name, value: strings.TrimSpace(value)})
	}
	return out
}

func hasCookieAuth(authHeaders map[string]string) bool {
	return cookieHeaderValue(authHeaders) != ""
}
