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
)

const domRedirectProbeTimeout = 8 * time.Second

// DOMRedirectValidator confirms open redirects that only run in the browser,
// including ones that assign location from a click handler.
type DOMRedirectValidator struct {
	cfg    config.DiscoveryConfig
	logger *slog.Logger

	mu      sync.Mutex
	browser *rod.Browser
	cleanup func()
}

func NewDOMRedirectValidator(cfg config.DiscoveryConfig, logger *slog.Logger) *DOMRedirectValidator {
	if logger == nil {
		logger = slog.Default()
	}
	return &DOMRedirectValidator{cfg: cfg, logger: logger}
}

func (v *DOMRedirectValidator) Analyze(ctx context.Context, response types.Response) *Finding {
	if v == nil || !v.cfg.RodEnabled {
		return nil
	}
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "REDIRECT") {
		return nil
	}
	host := payloadHost(response.PayloadUsed)
	if host == "" || !shouldProbeDOMXSS(response) {
		return nil
	}
	spec, err := injectors.BuildAttack(response.Job)
	if err != nil || strings.TrimSpace(spec.URL) == "" {
		return nil
	}
	origin := requestHostname(response.Job.Vector.Route)
	hit, err := v.probe(ctx, spec.URL, origin, host)
	if err != nil {
		v.logger.Warn("dom redirect probe failed", "url", spec.URL, "error", err)
		return nil
	}
	if !hit {
		return nil
	}
	return newFinding(response, "rendered page navigated to the injected redirect host")
}

func (v *DOMRedirectValidator) Close() error {
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.cleanup != nil {
		v.cleanup()
	}
	v.browser = nil
	v.cleanup = nil
	return nil
}

func (v *DOMRedirectValidator) probe(ctx context.Context, pageURL, originHost, payloadHost string) (bool, error) {
	browser, err := v.ensureBrowser(ctx)
	if err != nil {
		return false, err
	}
	probeCtx, cancel := context.WithTimeout(ctx, domRedirectProbeTimeout)
	defer cancel()

	page, err := browser.Context(probeCtx).Page(proto.TargetCreateTarget{URL: "about:blank"})
	if err != nil {
		return false, err
	}
	defer page.Close()

	if err := page.Navigate(pageURL); err != nil {
		return false, err
	}
	_ = page.WaitLoad()
	if navigationConfirmsRedirect(originHost, pageHref(page), payloadHost) {
		return true, nil
	}

	_, _ = page.Eval(`() => {
		const nodes = [...document.querySelectorAll("[onclick]")];
		const el = nodes.find((node) => /location/i.test(node.getAttribute("onclick") || ""));
		if (!el) return false;
		el.click();
		return true;
	}`)
	select {
	case <-probeCtx.Done():
	case <-time.After(1500 * time.Millisecond):
	}
	return navigationConfirmsRedirect(originHost, pageHref(page), payloadHost), nil
}

func (v *DOMRedirectValidator) ensureBrowser(ctx context.Context) (*rod.Browser, error) {
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

func pageHref(page *rod.Page) string {
	if page == nil {
		return ""
	}
	res, err := page.Eval(`() => location.href`)
	if err != nil || res == nil {
		return ""
	}
	return strings.TrimSpace(res.Value.Str())
}

func requestHostname(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return ""
	}
	return parsed.Hostname()
}

func navigationConfirmsRedirect(originHost, finalURL, host string) bool {
	if originHost == "" || host == "" {
		return false
	}
	parsed, err := url.Parse(strings.TrimSpace(finalURL))
	if err != nil {
		return false
	}
	got := parsed.Hostname()
	if got == "" || strings.EqualFold(got, originHost) {
		return false
	}
	return strings.EqualFold(got, host)
}

var _ io.Closer = (*DOMRedirectValidator)(nil)
