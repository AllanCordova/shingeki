package dynamic

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/go-rod/rod"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func registerPageURL(targetURL string, auth *contracts.TargetAuth) string {
	if auth != nil {
		if raw := strings.TrimSpace(auth.RegisterURL); raw != "" {
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
	return strings.TrimRight(parsed.String(), "/") + "/register"
}

func registerInBrowser(ctx context.Context, page *rod.Page, targetURL string, auth *contracts.TargetAuth) error {
	if err := page.Navigate(registerPageURL(targetURL, auth)); err != nil {
		return fmt.Errorf("navigate register: %w", err)
	}
	_ = page.WaitLoad()
	if err := waitAndFillRegister(ctx, page, auth); err != nil {
		return err
	}
	_ = page.WaitLoad()
	return nil
}

func waitAndFillRegister(ctx context.Context, page *rod.Page, auth *contracts.TargetAuth) error {
	if fields := contracts.FlattenAuthFields(contracts.ResolveAuthBody(auth.RegisterBody, auth.Username, auth.Password)); len(fields) > 0 {
		return waitAndFillNamedFields(ctx, page, fields, "no registration form found")
	}
	email, username := registerIdentity(auth.Username)
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
		status, err := fillRegisterForm(page, email, username, auth.Password, allowAdvance)
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
			return fmt.Errorf("no registration form found")
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

func registerIdentity(username string) (email string, user string) {
	username = strings.TrimSpace(username)
	if strings.Contains(username, "@") {
		email = username
		user = strings.TrimSpace(strings.SplitN(username, "@", 2)[0])
		if user == "" {
			user = "scanner"
		}
		return email, user
	}
	if username == "" {
		username = "scanner"
	}
	return username + "@example.com", username
}

func fillRegisterForm(page *rod.Page, email, username, password string, allowAdvance bool) (string, error) {
	advance := "false"
	if allowAdvance {
		advance = "true"
	}
	result, err := page.Eval(`(data) => {
		const email = data.email;
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
		const looksEmail = (el) => {
			const type = String(el.type || '').toLowerCase();
			const hay = haystack(el);
			return type === 'email' || hay.includes('email') || hay.includes('e-mail') || hay.includes('mail');
		};
		const looksUser = (el) => {
			const hay = haystack(el);
			return hay.includes('user') || hay.includes('login') || hay.includes('usuario');
		};
		const emailEl = fields.find(looksEmail);
		let userEl = fields.find((el) => el !== emailEl && looksUser(el));
		if (!emailEl && !userEl) {
			userEl = fields.find((el) => {
				const type = String(el.type || '').toLowerCase();
				return type === 'text' || type === 'email' || type === 'tel' || type === '';
			});
		}
		const passEls = fields.filter((el) => String(el.type || '').toLowerCase() === 'password');
		const nameEl = fields.find((el) => {
			if (el === emailEl || el === userEl || passEls.includes(el)) return false;
			const hay = haystack(el);
			return hay.includes('nome') || hay.includes('full') || (hay.includes('name') && !hay.includes('user'));
		});
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
		const acceptTerms = () => {
			document.querySelectorAll('input[type="checkbox"]').forEach((el) => {
				if (!el || el.checked || el.disabled) return;
				const labels = el.labels ? Array.from(el.labels).map((label) => label.innerText || '').join(' ') : '';
				const hay = (haystack(el) + ' ' + labels).toLowerCase();
				if (el.required || hay.includes('term') || hay.includes('aceito') || hay.includes('agree') || hay.includes('privacy') || hay.includes('privacidade')) {
					el.click();
				}
			});
		};
		if (passEls.length > 0 && (emailEl || userEl)) {
			setValue(emailEl, email);
			setValue(userEl, username);
			setValue(nameEl, 'Scanner User');
			passEls.forEach((el) => setValue(el, password));
			acceptTerms();
			clickSubmit(passEls[0]);
			return { status: 'filled' };
		}
		const identity = emailEl || userEl;
		if (identity && allowAdvance) {
			setValue(emailEl, email);
			setValue(userEl, username);
			clickSubmit(identity);
			return { status: 'advanced' };
		}
		if (identity) return { status: 'user' };
		return { status: 'waiting' };
	}`, map[string]string{
		"email":        email,
		"username":     username,
		"password":     password,
		"allowAdvance": advance,
	})
	if err != nil {
		return "", fmt.Errorf("fill registration form: %w", err)
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
