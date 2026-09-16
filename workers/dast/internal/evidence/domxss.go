package evidence

import (
	"context"
	"io"
	"log/slog"
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

const domXSSProbeTimeout = 8 * time.Second

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
	if !shouldProbeDOMXSS(response) {
		return nil
	}

	spec, err := injectors.BuildAttack(response.Job)
	if err != nil || strings.TrimSpace(spec.URL) == "" {
		return nil
	}

	hit, detail, err := v.probe(ctx, spec.URL)
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

func (v *DOMXSSValidator) probe(ctx context.Context, pageURL string) (bool, string, error) {
	browser, err := v.ensureBrowser(ctx)
	if err != nil {
		return false, "", err
	}

	probeCtx, cancel := context.WithTimeout(ctx, domXSSProbeTimeout)
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

	if err := page.Navigate(pageURL); err != nil {
		return false, "", err
	}
	_ = page.WaitLoad()
	select {
	case <-probeCtx.Done():
	case <-time.After(1500 * time.Millisecond):
	}

	select {
	case msg := <-dialog:
		if strings.TrimSpace(msg) == "" {
			msg = "alert"
		}
		return true, "JavaScript dialog opened in the rendered page (" + msg + ")", nil
	default:
	}

	if sink, ok := domSinkPresent(page); ok {
		return true, "payload opened an HTML JavaScript sink in the rendered DOM (" + sink + ")", nil
	}
	return false, "", nil
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

func domSinkPresent(page *rod.Page) (string, bool) {
	if page == nil {
		return "", false
	}
	res, err := page.Eval(`() => {
		const iframe = document.querySelector('iframe[src*="javascript:"]');
		if (iframe) return 'iframe[src=javascript:]';
		return '';
	}`)
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
