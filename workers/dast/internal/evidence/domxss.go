package evidence

import (
	"context"
	"io"
	"log/slog"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"

	"github.com/shingeki/dast-worker/internal/attack/injectors"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/discovery/dynamic"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

const (
	domXSSProbeTimeout    = 8 * time.Second
	domSourceProbeTimeout = 20 * time.Second
)

type DOMXSSValidator struct {
	cfg    config.DiscoveryConfig
	logger *slog.Logger

	mu      sync.Mutex
	browser *rod.Browser
	cleanup func()
}

func NewDOMXSSValidator(cfg config.DiscoveryConfig, logger *slog.Logger) *DOMXSSValidator {
	if logger == nil {
		logger = slog.Default()
	}
	return &DOMXSSValidator{cfg: cfg, logger: logger}
}

func (v *DOMXSSValidator) Analyze(ctx context.Context, response types.Response) *Finding {
	if v == nil || !v.cfg.RodEnabled {
		return nil
	}
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "XSS") {
		return nil
	}
	if strings.TrimSpace(response.PayloadUsed) == "" {
		return nil
	}
	browserSource := strings.EqualFold(response.Job.Attack.TargetLocation, "BROWSER") || response.Job.Placement == "browser"
	body := response.AttackBody
	if strings.TrimSpace(body) == "" {
		body = response.BaselineBody
	}
	if browserSource {
		if planDOMSource(body).Kind == "" {
			return nil
		}
	} else if !shouldProbeDOMXSS(response) {
		return nil
	}

	spec, err := injectors.BuildAttack(response.Job)
	if err != nil || strings.TrimSpace(spec.URL) == "" {
		return nil
	}

	hit, detail, err := v.probe(ctx, spec.URL, response.PayloadUsed, body, browserSource)
	if err != nil {
		v.logger.Warn("dom xss probe failed", "url", spec.URL, "error", err)
		return nil
	}
	if !hit {
		return nil
	}
	return newFinding(response, detail)
}

func (v *DOMXSSValidator) Close() error {
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.cleanup != nil {
		v.cleanup()
	}
	v.browser = nil
	v.cleanup = nil
	return nil
}

func (v *DOMXSSValidator) probe(ctx context.Context, pageURL, payload, body string, browserSource bool) (bool, string, error) {
	browser, err := v.ensureBrowser(ctx)
	if err != nil {
		return false, "", err
	}

	plan := planDOMSource(body)
	timeout := domXSSProbeTimeout
	if browserSource {
		timeout = domSourceProbeTimeout
	}
	probeCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	page, err := browser.Context(probeCtx).Page(proto.TargetCreateTarget{URL: "about:blank"})
	if err != nil {
		return false, "", err
	}
	defer page.Close()

	dialog := make(chan string, 1)
	go page.EachEvent(func(e *proto.PageJavascriptDialogOpening) {
		_ = proto.PageHandleJavaScriptDialog{Accept: true}.Call(page)
		select {
		case dialog <- e.Message:
		default:
		}
	})()

	if err := driveDOMSource(page, pageURL, payload, plan, browserSource); err != nil {
		return false, "", err
	}
	_ = page.WaitLoad()
	settle := domSettle(body, payload)
	select {
	case <-probeCtx.Done():
	case <-time.After(settle):
	}
	if browserSource && plan.Kind == "postmessage" {
		_, _ = page.Eval(`(payload) => {
			try { window.postMessage(JSON.stringify({html: payload, data: payload}), '*'); } catch (e) {}
			try { window.postMessage(payload, '*'); } catch (e) {}
		}`, payload)
		select {
		case <-probeCtx.Done():
		case <-time.After(settle):
		}
	}
	if browserSource && plan.Kind == "event" {
		_, _ = page.Eval(`(payload) => {
			const fire = (el) => {
				el.value = payload;
				el.dispatchEvent(new Event('input', {bubbles: true}));
				el.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true}));
				el.dispatchEvent(new Event('change', {bubbles: true}));
			};
			document.querySelectorAll('input, textarea').forEach(fire);
			document.querySelectorAll('form').forEach((form) => {
				form.querySelectorAll('input, textarea').forEach(fire);
				form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
			});
			document.querySelectorAll('input[type=submit], button[type=submit], button:not([type])').forEach((el) => {
				try { el.click(); } catch (e) {}
			});
		}`, payload)
		select {
		case <-probeCtx.Done():
		case <-time.After(settle):
		}
	}

	select {
	case msg := <-dialog:
		if strings.TrimSpace(msg) == "" {
			msg = "alert"
		}
		return true, "JavaScript dialog opened in the rendered page (" + msg + ")", nil
	default:
	}

	if sink, ok := domSinkPresent(page, payload); ok {
		return true, "payload opened an HTML JavaScript sink in the rendered DOM (" + sink + ")", nil
	}
	return false, "", nil
}

func driveDOMSource(page *rod.Page, pageURL, payload string, plan domSourcePlan, browserSource bool) error {
	if !browserSource || plan.Kind == "" {
		return page.Navigate(pageURL)
	}
	switch plan.Kind {
	case "cookie":
		if plan.CookieName != "" {
			_, _ = proto.NetworkSetCookie{URL: pageURL, Name: plan.CookieName, Value: payload, Path: "/"}.Call(page)
		}
		return page.Navigate(pageURL)
	case "name":
		if err := page.Navigate("about:blank"); err != nil {
			return err
		}
		_, _ = page.Eval(`(payload) => { window.name = payload }`, payload)
		return page.Navigate(pageURL)
	case "storage":
		origin := targeturl.Origin(pageURL)
		if origin == "" {
			return page.Navigate(pageURL)
		}
		if err := page.Navigate(origin + "/"); err != nil {
			return err
		}
		_ = page.WaitLoad()
		key := plan.StorageKey
		if key == "" {
			key = "badValue"
		}
		_, _ = page.Eval(`(payload, key) => {
			try { localStorage.setItem(key, payload); localStorage[key] = payload; } catch (e) {}
			try { sessionStorage.setItem(key, payload); sessionStorage[key] = payload; } catch (e) {}
		}`, payload, key)
		return page.Navigate(pageURL)
	case "referrer":
		origin := targeturl.Origin(pageURL)
		poison := origin + "/?r=" + url.QueryEscape(payload)
		if err := page.Navigate(poison); err != nil {
			return err
		}
		_ = page.WaitLoad()
		return page.Navigate(pageURL)
	case "url":
		return page.Navigate(withDOMPayload(pageURL, payload))
	default:
		return page.Navigate(pageURL)
	}
}

func domSettle(body, payload string) time.Duration {
	lower := strings.ToLower(body + " " + payload)
	if strings.Contains(lower, "ng-app") || strings.Contains(lower, "angular") || strings.Contains(payload, "{{") || strings.Contains(payload, "constructor.constructor") {
		return 4 * time.Second
	}
	return 1500 * time.Millisecond
}

func (v *DOMXSSValidator) ensureBrowser(ctx context.Context) (*rod.Browser, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.browser != nil {
		return v.browser, nil
	}

	timeout := v.cfg.BrowserLaunchTimeout
	if timeout <= 0 {
		timeout = 90 * time.Second
	}
	launchCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	browser, cleanup, err := dynamic.ConnectBrowser(launchCtx, v.cfg, v.logger)
	if err != nil {
		return nil, err
	}
	v.browser = browser
	v.cleanup = cleanup
	return browser, nil
}

func shouldProbeDOMXSS(response types.Response) bool {
	if targeturl.LooksLikeHashRouter(response.Job.Vector.Route) {
		return true
	}
	if targeturl.LooksLikeSearchQueryRoute(response.Job.Vector.Route) &&
		strings.Contains(response.Job.Vector.Route, "/#/") {
		return true
	}
	body := strings.TrimSpace(response.AttackBody)
	if body == "" {
		return false
	}
	if strings.HasPrefix(body, "{") || strings.HasPrefix(body, "[") {
		return false
	}
	lower := strings.ToLower(body)
	return strings.Contains(lower, "<html") ||
		strings.Contains(lower, "<!doctype") ||
		strings.Contains(lower, "<app-root")
}

func domSinkPresent(page *rod.Page, payload string) (string, bool) {
	if page == nil {
		return "", false
	}
	res, err := page.Eval(`(payload) => {
		const iframe = document.querySelector('iframe[src*="javascript:"]');
		if (iframe) return 'iframe[src=javascript:]';
		const link = document.querySelector('a[href^="javascript:"], area[href^="javascript:"], form[action^="javascript:"], button[formaction^="javascript:"]');
		if (link) return 'url[javascript:]';
		const nodes = document.querySelectorAll('*');
		for (const el of nodes) {
			for (const attr of Array.from(el.attributes || [])) {
				const name = attr.name.toLowerCase();
				const value = attr.value || '';
				if (name.indexOf('on') !== 0 || value.toLowerCase().indexOf('alert') === -1) continue;
				if (payload && (payload.indexOf(value) !== -1 || value.indexOf(payload) !== -1)) {
					return el.tagName.toLowerCase() + '[' + name + ']';
				}
			}
		}
		return '';
	}`, payload)
	if err != nil || res == nil {
		return "", false
	}
	sink := strings.TrimSpace(res.Value.Str())
	if sink == "" {
		return "", false
	}
	return sink, true
}

var _ io.Closer = (*DOMXSSValidator)(nil)
