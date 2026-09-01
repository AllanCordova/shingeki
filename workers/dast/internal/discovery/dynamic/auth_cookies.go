package dynamic

import (
	"net/url"
	"strings"

	"github.com/go-rod/rod/lib/proto"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func cookieParamsFromAuth(seedURL string, auth *contracts.TargetAuth) []*proto.NetworkCookieParam {
	if auth == nil {
		return nil
	}
	out := cookieParamsFromCaptured(seedURL, auth.Cookies)
	seen := make(map[string]struct{}, len(out))
	for _, cookie := range out {
		seen[strings.ToLower(cookie.Name)] = struct{}{}
	}
	for _, headerCookie := range cookieParamsFromHeader(seedURL, auth.Headers) {
		if _, exists := seen[strings.ToLower(headerCookie.Name)]; exists {
			continue
		}
		seen[strings.ToLower(headerCookie.Name)] = struct{}{}
		out = append(out, headerCookie)
	}
	return out
}

func cookieParamsFromCaptured(seedURL string, cookies []contracts.CapturedCookie) []*proto.NetworkCookieParam {
	out := make([]*proto.NetworkCookieParam, 0, len(cookies))
	for _, cookie := range cookies {
		name := strings.TrimSpace(cookie.Name)
		value := strings.TrimSpace(cookie.Value)
		if name == "" || value == "" {
			continue
		}
		param := &proto.NetworkCookieParam{
			Name:     name,
			Value:    value,
			URL:      cookieURL(cookie, seedURL),
			Path:     cookie.Path,
			Secure:   cookie.Secure,
			HTTPOnly: cookie.HTTPOnly,
		}
		if param.Path == "" {
			param.Path = "/"
		}
		if !cookie.HostOnly && strings.TrimSpace(cookie.Domain) != "" {
			param.Domain = strings.TrimSpace(cookie.Domain)
		}
		if sameSite := mapSameSite(cookie.SameSite); sameSite != "" {
			param.SameSite = sameSite
		}
		if !cookie.Session && cookie.ExpirationDate > 0 {
			param.Expires = proto.TimeSinceEpoch(cookie.ExpirationDate)
		}
		if cookie.PartitionKey != nil && strings.TrimSpace(cookie.PartitionKey.TopLevelSite) != "" {
			param.PartitionKey = &proto.NetworkCookiePartitionKey{
				TopLevelSite:         strings.TrimSpace(cookie.PartitionKey.TopLevelSite),
				HasCrossSiteAncestor: cookie.PartitionKey.HasCrossSiteAncestor,
			}
		}
		out = append(out, param)
	}
	return out
}

func cookieParamsFromHeader(seedURL string, authHeaders map[string]string) []*proto.NetworkCookieParam {
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
			Name:   pair.name,
			Value:  pair.value,
			URL:    origin,
			Path:   "/",
			Secure: secure,
		}
		out = append(out, param)
	}
	return out
}

func cookieURL(cookie contracts.CapturedCookie, seedURL string) string {
	host := strings.TrimSpace(cookie.Domain)
	host = strings.TrimPrefix(host, ".")
	if host == "" {
		return originFromURL(seedURL)
	}
	scheme := "https"
	if parsed, err := url.Parse(seedURL); err == nil && parsed.Scheme != "" {
		scheme = parsed.Scheme
	}
	if cookie.Secure {
		scheme = "https"
	}
	return scheme + "://" + strings.ToLower(host) + "/"
}

func mapSameSite(value string) proto.NetworkCookieSameSite {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "strict":
		return proto.NetworkCookieSameSiteStrict
	case "lax":
		return proto.NetworkCookieSameSiteLax
	case "no_restriction", "none":
		return proto.NetworkCookieSameSiteNone
	default:
		return ""
	}
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

func hasCookieAuth(auth *contracts.TargetAuth) bool {
	if auth == nil {
		return false
	}
	if len(auth.Cookies) > 0 {
		return true
	}
	return cookieHeaderValue(auth.Headers) != ""
}
