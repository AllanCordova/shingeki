package dynamic

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func loginURL(targetURL string, auth *contracts.TargetAuth) string {
	if auth != nil {
		if raw := strings.TrimSpace(auth.LoginURL); raw != "" {
			return raw
		}
	}
	parsed, err := url.Parse(strings.TrimSpace(targetURL))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return strings.TrimSpace(targetURL)
	}
	parsed.Fragment = ""
	parsed.RawQuery = ""
	parsed.Path = strings.TrimSuffix(parsed.Path, "/")
	return strings.TrimRight(parsed.String(), "/") + "/login"
}

func authenticateBrowser(
	ctx context.Context,
	browser *rod.Browser,
	page *rod.Page,
	targetURL string,
	auth *contracts.TargetAuth,
	settle func(context.Context),
) error {
	if !auth.HasCredentials() {
		return nil
	}

	if hasSessionAuth(auth) {
		if err := injectBrowserAuth(browser, page, targetURL, targetURL, auth); err != nil {
			return err
		}
		if err := page.Navigate(targetURL); err != nil {
			return fmt.Errorf("navigate after json login: %w", err)
		}
		_ = page.WaitLoad()
		settle(ctx)
		harvestBrowserSession(browser, page, auth)
		return nil
	}

	if err := page.Navigate(loginURL(targetURL, auth)); err != nil {
		return fmt.Errorf("navigate login: %w", err)
	}
	_ = page.WaitLoad()
	settle(ctx)

	filled, err := fillLoginForm(page, auth.Username, auth.Password)
	if err != nil {
		return err
	}
	if !filled {
		return fmt.Errorf("no login form found")
	}
	_ = page.WaitLoad()
	settle(ctx)
	harvestBrowserSession(browser, page, auth)
	if !hasSessionAuth(auth) && !pageLooksLoggedIn(page, auth) {
		return fmt.Errorf("login did not establish a session")
	}
	return nil
}

func fillLoginForm(page *rod.Page, username, password string) (bool, error) {
	result, err := page.Eval(`(data) => {
		const username = data.username;
		const password = data.password;
		const inputs = Array.from(document.querySelectorAll('input, textarea'));
		const looksUser = (el) => {
			const type = String(el.type || '').toLowerCase();
			const hay = (String(el.name || '') + String(el.id || '') + String(el.autocomplete || '') + String(el.placeholder || '')).toLowerCase();
			return type === 'email' || hay.includes('email') || hay.includes('user') || hay.includes('login') || hay.includes('mail');
		};
		let userEl = inputs.find(looksUser);
		if (!userEl) {
			userEl = inputs.find((el) => {
				const type = String(el.type || '').toLowerCase();
				return type === 'text' || type === 'email';
			});
		}
		const passEl = inputs.find((el) => String(el.type || '').toLowerCase() === 'password');
		const setValue = (el, value) => {
			if (!el) return;
			el.focus();
			const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
			const desc = Object.getOwnPropertyDescriptor(proto, 'value');
			if (desc && desc.set) desc.set.call(el, value);
			else el.value = value;
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		};
		setValue(userEl, username);
		setValue(passEl, password);
		if (!passEl) return { ok: false };
		const form = passEl.form || document.querySelector('form');
		const submit = form && (form.querySelector('button[type="submit"], input[type="submit"], button') || form);
		if (submit && typeof submit.click === 'function') submit.click();
		else if (form) form.submit();
		return { ok: true };
	}`, map[string]string{
		"username": username,
		"password": password,
	})
	if err != nil {
		return false, fmt.Errorf("fill login form: %w", err)
	}
	var filled struct {
		OK bool `json:"ok"`
	}
	if err := result.Value.Unmarshal(&filled); err != nil {
		return false, err
	}
	return filled.OK, nil
}

func pageLooksLoggedIn(page *rod.Page, auth *contracts.TargetAuth) bool {
	if looksLikeLoginURL(pageURL(page)) {
		return false
	}
	indicator := ""
	if auth != nil {
		indicator = strings.TrimSpace(auth.LoggedInIndicator)
	}
	if indicator == "" {
		return !looksLikeLoginURL(pageURL(page))
	}
	result, err := page.Eval(`(needle) => (document.body && document.body.innerText || '').includes(needle)`, indicator)
	if err != nil {
		return false
	}
	return result.Value.Bool()
}

func harvestBrowserSession(browser *rod.Browser, page *rod.Page, auth *contracts.TargetAuth) {
	if auth == nil {
		return
	}
	if cookies, err := browser.GetCookies(); err == nil {
		auth.Cookies = mergeCapturedCookies(auth.Cookies, cookiesFromNetwork(cookies))
	}
	dumped, err := page.Eval(`() => {
		const dump = (storage) => {
			const out = {};
			if (!storage) return out;
			for (let i = 0; i < storage.length; i += 1) {
				const key = storage.key(i);
				if (!key) continue;
				const value = storage.getItem(key);
				if (typeof value === 'string' && value.length > 0 && value.length <= 8192) {
					out[key] = value;
				}
			}
			return out;
		};
		return { local: dump(window.localStorage), session: dump(window.sessionStorage) };
	}`)
	if err != nil {
		return
	}
	var storage struct {
		Local   map[string]string `json:"local"`
		Session map[string]string `json:"session"`
	}
	if err := dumped.Value.Unmarshal(&storage); err != nil {
		return
	}
	if len(storage.Local) == 0 && len(storage.Session) == 0 {
		return
	}
	if auth.Storage == nil {
		auth.Storage = &contracts.TargetStorage{}
	}
	auth.Storage.Local = mergeStringMap(auth.Storage.Local, storage.Local)
	auth.Storage.Session = mergeStringMap(auth.Storage.Session, storage.Session)
}

func cookiesFromNetwork(cookies []*proto.NetworkCookie) []contracts.CapturedCookie {
	out := make([]contracts.CapturedCookie, 0, len(cookies))
	for _, cookie := range cookies {
		if cookie == nil || strings.TrimSpace(cookie.Name) == "" {
			continue
		}
		row := contracts.CapturedCookie{
			Name:     cookie.Name,
			Value:    cookie.Value,
			Domain:   cookie.Domain,
			Path:     cookie.Path,
			Secure:   cookie.Secure,
			HTTPOnly: cookie.HTTPOnly,
			SameSite: string(cookie.SameSite),
			Session:  cookie.Session,
		}
		if cookie.Expires > 0 {
			row.ExpirationDate = float64(cookie.Expires)
		}
		out = append(out, row)
	}
	return out
}

func mergeCapturedCookies(existing, extra []contracts.CapturedCookie) []contracts.CapturedCookie {
	seen := map[string]int{}
	out := make([]contracts.CapturedCookie, 0, len(existing)+len(extra))
	for _, cookie := range existing {
		key := cookie.Name + "|" + cookie.Domain + "|" + cookie.Path
		seen[key] = len(out)
		out = append(out, cookie)
	}
	for _, cookie := range extra {
		key := cookie.Name + "|" + cookie.Domain + "|" + cookie.Path
		if idx, ok := seen[key]; ok {
			out[idx] = cookie
			continue
		}
		seen[key] = len(out)
		out = append(out, cookie)
	}
	return out
}

func mergeStringMap(dst contracts.StringMap, src map[string]string) contracts.StringMap {
	if len(src) == 0 {
		return dst
	}
	if dst == nil {
		dst = contracts.StringMap{}
	}
	for key, value := range src {
		if strings.TrimSpace(key) == "" || strings.TrimSpace(value) == "" {
			continue
		}
		dst[key] = value
	}
	return dst
}
