package dynamic

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"

	"github.com/shingeki/dast-worker/internal/contracts"
)

const loginFieldTimeout = 15 * time.Second

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

	if auth.WantsRegistration() {
		if err := registerInBrowser(ctx, page, targetURL, auth); err == nil {
			_ = page.WaitLoad()
			settle(ctx)
			harvestBrowserSession(browser, page, auth)
			if hasSessionAuth(auth) {
				return nil
			}
		}
	}

	if err := page.Navigate(loginURL(targetURL, auth)); err != nil {
		return fmt.Errorf("navigate login: %w", err)
	}
	_ = page.WaitLoad()

	if err := waitAndFillLogin(ctx, page, auth); err != nil {
		return err
	}
	_ = page.WaitLoad()
	settle(ctx)
	harvestBrowserSession(browser, page, auth)
	if !hasSessionAuth(auth) && !pageLooksLoggedIn(page, auth) {
		return fmt.Errorf("login did not establish a session")
	}
	return nil
}

func waitAndFillLogin(ctx context.Context, page *rod.Page, auth *contracts.TargetAuth) error {
	if auth != nil {
		if fields := contracts.FlattenAuthFields(contracts.ResolveAuthBody(auth.LoginBody, auth.Username, auth.Password)); len(fields) > 0 {
			return waitAndFillNamedFields(ctx, page, fields, "no login form found")
		}
	}
	username := ""
	password := ""
	if auth != nil {
		username = auth.Username
		password = auth.Password
	}
	deadline := time.Now().Add(loginFieldTimeout)
	if until, ok := ctx.Deadline(); ok && until.Before(deadline) {
		deadline = until
	}
	var userSeen time.Time
	advanced := false
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		allowAdvance := !advanced && !userSeen.IsZero() && time.Since(userSeen) >= 2*time.Second
		status, err := fillLoginForm(page, username, password, allowAdvance)
		if err != nil {
			return err
		}
		switch status {
		case "filled":
			return nil
		case "advanced":
			advanced = true
			userSeen = time.Time{}
		case "user":
			if userSeen.IsZero() {
				userSeen = time.Now()
			}
		default:
			userSeen = time.Time{}
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("no login form found")
		}
		timer := time.NewTimer(250 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
}

func fillLoginForm(page *rod.Page, username, password string, allowAdvance bool) (string, error) {
	advance := "false"
	if allowAdvance {
		advance = "true"
	}
	result, err := page.Eval(`(data) => {
		const username = data.username;
		const password = data.password;
		const allowAdvance = data.allowAdvance === 'true';
		const collect = (root, out) => {
			if (!root || !root.querySelectorAll) return;
			root.querySelectorAll('input, textarea').forEach((el) => out.push(el));
			root.querySelectorAll('*').forEach((el) => {
				if (el.shadowRoot) collect(el.shadowRoot, out);
			});
		};
		const inputs = [];
		collect(document, inputs);
		document.querySelectorAll('iframe').forEach((frame) => {
			try {
				if (frame.contentDocument) collect(frame.contentDocument, inputs);
			} catch (e) {}
		});
		const visible = (el) => {
			if (!el || el.disabled) return false;
			const type = String(el.type || '').toLowerCase();
			if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio' || type === 'file') return false;
			const style = window.getComputedStyle(el);
			if (style.display === 'none' || style.visibility === 'hidden') return false;
			const rect = el.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		};
		const fields = inputs.filter(visible);
		const haystack = (el) => (String(el.name || '') + ' ' + String(el.id || '') + ' ' + String(el.autocomplete || '') + ' ' + String(el.placeholder || '') + ' ' + String(el.getAttribute('aria-label') || '')).toLowerCase();
		const looksUser = (el) => {
			const type = String(el.type || '').toLowerCase();
			const hay = haystack(el);
			return type === 'email' || hay.includes('email') || hay.includes('e-mail') || hay.includes('user') || hay.includes('login') || hay.includes('mail') || hay.includes('usuario');
		};
		let userEl = fields.find(looksUser);
		if (!userEl) {
			userEl = fields.find((el) => {
				const type = String(el.type || '').toLowerCase();
				return type === 'text' || type === 'email' || type === 'tel' || type === '';
			});
		}
		const passEl = fields.find((el) => String(el.type || '').toLowerCase() === 'password');
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
		const clickSubmit = (el) => {
			const form = (el && el.form) || document.querySelector('form');
			const root = (el && el.getRootNode && el.getRootNode()) || document;
			const submit = (form && form.querySelector('button[type="submit"], input[type="submit"], button'))
				|| (root.querySelector && root.querySelector('button[type="submit"], input[type="submit"], button'));
			if (submit && typeof submit.click === 'function') submit.click();
			else if (form && typeof form.submit === 'function') form.submit();
		};
		if (passEl) {
			setValue(userEl, username);
			setValue(passEl, password);
			clickSubmit(passEl);
			return { status: 'filled' };
		}
		if (userEl && allowAdvance) {
			setValue(userEl, username);
			clickSubmit(userEl);
			return { status: 'advanced' };
		}
		if (userEl) return { status: 'user' };
		return { status: 'waiting' };
	}`, map[string]string{
		"username":     username,
		"password":     password,
		"allowAdvance": advance,
	})
	if err != nil {
		return "", fmt.Errorf("fill login form: %w", err)
	}
	var filled struct {
		Status string `json:"status"`
	}
	if err := result.Value.Unmarshal(&filled); err != nil {
		return "", err
	}
	if filled.Status == "" {
		return "waiting", nil
	}
	return filled.Status, nil
}

func pageLooksLoggedIn(page *rod.Page, auth *contracts.TargetAuth) bool {
	current := pageURL(page)
	if looksLikeLoginURL(current) || looksLikeRegisterURL(current) || looksLikeAuthFragment(current) {
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
