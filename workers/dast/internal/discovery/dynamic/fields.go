package dynamic

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-rod/rod"
)

func waitAndFillNamedFields(ctx context.Context, page *rod.Page, fields map[string]string, timeoutErr string) error {
	deadline := time.Now().Add(loginFieldTimeout)
	if until, ok := ctx.Deadline(); ok && until.Before(deadline) {
		deadline = until
	}
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		status, err := fillNamedFields(page, fields)
		if err != nil {
			return err
		}
		if status == "filled" {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("%s", timeoutErr)
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

func fillNamedFields(page *rod.Page, fields map[string]string) (string, error) {
	raw, err := json.Marshal(fields)
	if err != nil {
		return "", err
	}
	result, err := page.Eval(`(raw) => {
		const fields = JSON.parse(raw);
		const collect = (root, out) => {
			if (!root || !root.querySelectorAll) return;
			root.querySelectorAll('input, textarea, select').forEach((el) => out.push(el));
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
			const tag = String(el.tagName || '').toLowerCase();
			const type = String(el.type || '').toLowerCase();
			if (tag === 'input' && (type === 'hidden' || type === 'submit' || type === 'button' || type === 'file')) return false;
			const style = window.getComputedStyle(el);
			if (style.display === 'none' || style.visibility === 'hidden') return false;
			const rect = el.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		};
		const elements = inputs.filter(visible);
		const exact = (key) => elements.find((el) => {
			const want = String(key || '').toLowerCase();
			return [el.name, el.id, el.getAttribute('autocomplete')].some((value) => String(value || '').toLowerCase() === want);
		});
		const loose = (key) => elements.find((el) => {
			const want = String(key || '').toLowerCase();
			const hay = [el.name, el.id, el.placeholder, el.getAttribute('aria-label'), el.getAttribute('autocomplete')].join(' ').toLowerCase();
			return hay.includes(want);
		});
		const setValue = (el, value) => {
			if (!el) return false;
			const tag = String(el.tagName || '').toLowerCase();
			const type = String(el.type || '').toLowerCase();
			if (type === 'checkbox') {
				const on = value === 'true' || value === '1' || value === 'yes' || value === 'on';
				if (el.checked !== on) el.click();
				return true;
			}
			if (tag === 'select') {
				const want = String(value || '').toLowerCase();
				const option = Array.from(el.options || []).find((item) => String(item.value || '').toLowerCase() === want || String(item.text || '').toLowerCase().includes(want));
				if (!option) return false;
				el.value = option.value;
				el.dispatchEvent(new Event('input', { bubbles: true }));
				el.dispatchEvent(new Event('change', { bubbles: true }));
				return true;
			}
			el.focus();
			const proto = tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
			const desc = Object.getOwnPropertyDescriptor(proto, 'value');
			if (desc && desc.set) desc.set.call(el, value);
			else el.value = value;
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
			return true;
		};
		let filled = 0;
		let anchor = null;
		Object.keys(fields).forEach((key) => {
			const el = exact(key) || loose(key);
			if (!el) return;
			if (setValue(el, String(fields[key] ?? ''))) {
				filled += 1;
				anchor = el;
			}
		});
		if (!filled || !anchor) return { status: 'waiting' };
		const form = anchor.form || document.querySelector('form');
		const root = (anchor.getRootNode && anchor.getRootNode()) || document;
		const submit = (form && form.querySelector('button[type="submit"], input[type="submit"], button'))
			|| (root.querySelector && root.querySelector('button[type="submit"], input[type="submit"], button'));
		if (submit && typeof submit.click === 'function') submit.click();
		else if (form && typeof form.submit === 'function') form.submit();
		return { status: 'filled' };
	}`, string(raw))
	if err != nil {
		return "", fmt.Errorf("fill named fields: %w", err)
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
