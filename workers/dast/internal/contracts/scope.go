package contracts

import (
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func HostInScope(targetURL, rawURL string) bool {
	targetHost := requestHost(targetURL)
	host := requestHost(rawURL)
	if targetHost == "" || host == "" {
		return false
	}
	if targeturl.IsDisallowedHost(host) {
		return false
	}
	return host == targetHost || strings.HasSuffix(host, "."+targetHost)
}

func HeadersForURL(auth *TargetAuth, targetURL, rawURL string) map[string]string {
	if auth == nil || !HostInScope(targetURL, rawURL) {
		return nil
	}

	out := map[string]string{}
	for key, value := range auth.Headers {
		if strings.EqualFold(key, "Cookie") || strings.EqualFold(key, "Authorization") {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			continue
		}
		out[key] = value
	}

	if cookie := CookieHeaderForURL(CookiesForTarget(targetURL, auth.Cookies), rawURL); cookie != "" {
		out["Cookie"] = cookie
	}
	if headerValue(out, "Authorization") == "" {
		if existing := headerValue(auth.Headers, "Authorization"); existing != "" {
			out["Authorization"] = existing
		} else if token := storageBearerToken(auth.Storage); token != "" {
			out["Authorization"] = token
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func CookiesForTarget(targetURL string, cookies []CapturedCookie) []CapturedCookie {
	return filterCookies(targetURL, cookies, false)
}

func CookiesForBrowser(targetURL string, cookies []CapturedCookie) []CapturedCookie {
	return filterCookies(targetURL, cookies, true)
}

func filterCookies(targetURL string, cookies []CapturedCookie, hostOnly bool) []CapturedCookie {
	targetHost := requestHost(targetURL)
	if targetHost == "" {
		return nil
	}
	out := make([]CapturedCookie, 0, len(cookies))
	for _, cookie := range cookies {
		if !cookieRelevantToTarget(targetHost, cookie) {
			continue
		}
		if hostOnly {
			cookie.Domain = targetHost
			cookie.HostOnly = true
		}
		out = append(out, cookie)
	}
	return out
}

func cookieRelevantToTarget(targetHost string, cookie CapturedCookie) bool {
	domain := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(cookie.Domain)), ".")
	if domain == "" {
		return true
	}
	return domain == targetHost || strings.HasSuffix(targetHost, "."+domain) || strings.HasSuffix(domain, "."+targetHost)
}

func requestHost(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return ""
	}
	return strings.ToLower(parsed.Hostname())
}
