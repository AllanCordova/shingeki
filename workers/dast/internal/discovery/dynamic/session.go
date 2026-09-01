package dynamic

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func extraHeaderPairs(authHeaders map[string]string) []string {
	if len(authHeaders) == 0 {
		return nil
	}
	pairs := make([]string, 0, len(authHeaders)*2)
	for key, value := range authHeaders {
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			continue
		}
		if strings.EqualFold(key, "Cookie") {
			continue
		}
		pairs = append(pairs, key, value)
	}
	return pairs
}

func originFromURL(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}
	return parsed.Scheme + "://" + parsed.Host + "/"
}

func hasSessionAuth(auth *contracts.TargetAuth) bool {
	if auth == nil {
		return false
	}
	headers := contracts.EffectiveAuthHeaders(auth)
	if hasCookieAuth(auth) {
		return true
	}
	if headerValue(headers, "Authorization") != "" {
		return true
	}
	if auth.Storage == nil {
		return false
	}
	if len(auth.Storage.Local) > 0 || len(auth.Storage.Session) > 0 || len(auth.Storage.Origins) > 0 {
		return true
	}
	return false
}

func headerValue(headers map[string]string, name string) string {
	for key, value := range headers {
		if strings.EqualFold(strings.TrimSpace(key), name) {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func injectBrowserAuth(browser *rod.Browser, page *rod.Page, targetURL, seedURL string, auth *contracts.TargetAuth) error {
	cookies := cookieParamsFromAuth(seedURL, auth)
	if len(cookies) > 0 {
		if err := browser.SetCookies(cookies); err != nil {
			if pageErr := page.SetCookies(cookies); pageErr != nil {
				return fmt.Errorf("set auth cookies: %w", pageErr)
			}
		}
	}

	headers := contracts.EffectiveAuthHeaders(auth)
	if pairs := extraHeaderPairs(headers); len(pairs) > 0 {
		if _, err := page.SetExtraHeaders(pairs); err != nil {
			return fmt.Errorf("set extra headers: %w", err)
		}
	}

	origins := storageOrigins(targetURL, seedURL, auth)
	if len(origins) == 0 {
		return nil
	}

	for _, origin := range origins {
		if err := page.Navigate(origin.origin); err != nil {
			return fmt.Errorf("navigate origin for storage: %w", err)
		}
		_ = page.WaitLoad()
		if err := writeStorage(page, origin.local, origin.session); err != nil {
			return err
		}
	}
	return nil
}

type storageOrigin struct {
	origin  string
	local   map[string]string
	session map[string]string
}

func storageOrigins(targetURL, seedURL string, auth *contracts.TargetAuth) []storageOrigin {
	if auth == nil || auth.Storage == nil {
		return nil
	}
	storage := auth.Storage
	out := make([]storageOrigin, 0, len(storage.Origins)+1)
	seen := map[string]struct{}{}
	for _, row := range storage.Origins {
		origin := strings.TrimSpace(row.Origin)
		if origin == "" {
			continue
		}
		if !strings.HasSuffix(origin, "/") {
			origin += "/"
		}
		if !allowedStorageOrigin(targetURL, origin) {
			continue
		}
		if _, exists := seen[origin]; exists {
			continue
		}
		seen[origin] = struct{}{}
		out = append(out, storageOrigin{origin: origin, local: map[string]string(row.Local), session: map[string]string(row.Session)})
	}
	if len(out) == 0 {
		if len(storage.Local) == 0 && len(storage.Session) == 0 {
			return nil
		}
		origin := originFromURL(seedURL)
		if origin == "" || !allowedStorageOrigin(targetURL, origin) {
			return nil
		}
		out = append(out, storageOrigin{origin: origin, local: map[string]string(storage.Local), session: map[string]string(storage.Session)})
	}
	return out
}

func allowedStorageOrigin(targetURL, origin string) bool {
	parsed, err := url.Parse(strings.TrimSpace(origin))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return false
	}
	if targeturl.IsDisallowedHost(parsed.Hostname()) {
		return false
	}
	return bfs.SameOrigin(targetURL, origin)
}

func writeStorage(page *rod.Page, local, session map[string]string) error {
	if len(local) == 0 && len(session) == 0 {
		return nil
	}
	payload := map[string]any{
		"local":   map[string]string{},
		"session": map[string]string{},
	}
	if local != nil {
		payload["local"] = local
	}
	if session != nil {
		payload["session"] = session
	}
	_, err := page.Eval(`(data) => {
		const write = (store, values) => {
			if (!values) return;
			for (const [key, value] of Object.entries(values)) {
				if (typeof key !== 'string' || typeof value !== 'string') continue;
				try { store.setItem(key, value); } catch (e) {}
			}
		};
		write(window.localStorage, data.local);
		write(window.sessionStorage, data.session);
	}`, payload)
	return err
}

func applyStealth(page *rod.Page, userAgent string) error {
	if strings.TrimSpace(userAgent) == "" {
		userAgent = stealthUserAgent
	}
	if err := (proto.NetworkSetUserAgentOverride{
		UserAgent:      userAgent,
		AcceptLanguage: "en-US,en;q=0.9",
		Platform:       stealthPlatform(userAgent),
	}).Call(page); err != nil {
		return err
	}
	_, err := page.Eval(`() => {
		Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
		Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
		Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
	}`)
	return err
}

func stealthPlatform(userAgent string) string {
	switch {
	case strings.Contains(userAgent, "Linux"):
		return "Linux"
	case strings.Contains(userAgent, "Mac"):
		return "macOS"
	default:
		return "Windows"
	}
}
