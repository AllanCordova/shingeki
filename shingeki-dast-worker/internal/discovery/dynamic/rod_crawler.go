package dynamic

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/proto"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
)

const clickableSelector = `a[href], button, [role="button"], [role="link"]`

// Prefer a desktop Chrome UA so headless Chromium does not advertise HeadlessChrome.
const stealthUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

type RodCrawler struct {
	cfg    config.DiscoveryConfig
	attack config.AttackConfig
	logger *slog.Logger
}

func NewRodCrawler(discoveryCfg config.DiscoveryConfig, attackCfg config.AttackConfig, logger *slog.Logger) *RodCrawler {
	if logger == nil {
		logger = slog.Default()
	}
	return &RodCrawler{cfg: discoveryCfg, attack: attackCfg, logger: logger}
}

func (r *RodCrawler) Discover(
	ctx context.Context,
	targetURL string,
	authHeaders map[string]string,
	seedURL string,
) ([]contracts.AttackVector, error) {
	if !r.cfg.RodEnabled {
		return nil, nil
	}
	if strings.TrimSpace(seedURL) == "" {
		seedURL = targetURL
	}

	launchCtx, launchCancel := context.WithTimeout(ctx, r.cfg.BrowserLaunchTimeout)
	defer launchCancel()

	browser, cleanup, err := r.launchBrowser(launchCtx)
	if err != nil {
		return nil, err
	}
	defer cleanup()

	exploreTimeout := r.exploreBudget()
	exploreCtx, exploreCancel := context.WithTimeout(ctx, exploreTimeout)
	defer exploreCancel()

	page, err := browser.Context(exploreCtx).Page(proto.TargetCreateTarget{URL: "about:blank"})
	if err != nil {
		return nil, fmt.Errorf("create page: %w", err)
	}
	defer page.Close()

	if err := r.applyStealth(page); err != nil {
		r.logger.Warn("stealth profile incomplete", "error", err)
	}

	vectors := make(map[string]contracts.AttackVector)
	record := func(vector contracts.AttackVector) {
		if !bfs.IsAttackableDiscoveryURL(targetURL, vector.Route) {
			return
		}
		key := vector.Method + " " + vector.Route + " " + vector.TargetLocation
		vectors[key] = vector
	}

	// Passive network observation only. Fetch hijacking broke authenticated SaaS sessions.
	if err := (proto.NetworkEnable{}).Call(page); err != nil {
		return nil, fmt.Errorf("enable network domain: %w", err)
	}
	go page.EachEvent(func(e *proto.NetworkRequestWillBeSent) {
		if e == nil || e.Request == nil {
			return
		}
		method := strings.ToUpper(e.Request.Method)
		route := e.Request.URL
		contentType := ""
		if e.Request.Headers != nil {
			if v, ok := e.Request.Headers["Content-Type"]; ok {
				contentType = v.String()
			} else if v, ok := e.Request.Headers["content-type"]; ok {
				contentType = v.String()
			}
		}
		vector := contracts.NewAttackVector(route, method, classifyTargetLocation(method, contentType))
		if body := e.Request.PostData; body != "" {
			vector.Body = body
			mergeJSONParams(vector, body)
		}
		if u, err := url.Parse(route); err == nil {
			for key, values := range u.Query() {
				if len(values) > 0 {
					vector.Params[key] = values[0]
				}
			}
		}
		record(vector)
	})()

	cookies := cookieParamsFromAuth(seedURL, authHeaders)

	if len(cookies) > 0 {
		// Set on the browser before any navigation. Warm-up to "/" triggered hcaptcha
		// and is unnecessary once URL-scoped cookies work.
		if err := browser.SetCookies(cookies); err != nil {
			r.logger.Warn("browser set auth cookies failed", "error", err, "count", len(cookies))
			if err := page.SetCookies(cookies); err != nil {
				r.logger.Warn("set auth cookies failed", "error", err, "count", len(cookies))
			}
		} else {
			r.logger.Info("applied auth cookies for dynamic discovery",
				"count", len(cookies),
				"has_cookie_header", true,
			)
		}

		cookieHeader := cookieHeaderValue(authHeaders)
		if cookieHeader != "" {
			if _, err := page.SetExtraHeaders([]string{"Cookie", cookieHeader}); err != nil {
				r.logger.Warn("set cookie extra header failed", "error", err)
			}
		}
	} else if len(authHeaders) == 0 {
		r.logger.Warn("dynamic discovery running without auth headers; authenticated SPA routes may redirect to login")
	}

	if err := page.Navigate(seedURL); err != nil {
		return nil, fmt.Errorf("navigate %q: %w", seedURL, err)
	}
	_ = page.WaitLoad()
	r.settle(exploreCtx)

	if landed := pageURL(page); looksLikeLoginURL(landed) {
		r.logger.Warn("seed landed on login page; auth cookies may be missing or invalid — skipping click explore",
			"seed", seedURL,
			"landed", landed,
			"has_cookie_header", hasCookieAuth(authHeaders),
		)
		record(contracts.NewAttackVector(landed, "GET", "URL_PATH"))
		return finalizeVectors(vectors, r, seedURL, targetURL, 1, 0), nil
	}

	visitedPages := make(map[string]struct{})
	clicked := make(map[string]struct{})
	pagesVisited := 0
	clicks := 0
	maxPages := r.cfg.MaxPages
	if maxPages <= 0 {
		maxPages = 50
	}
	maxClicks := r.cfg.MaxClicks
	if maxClicks <= 0 {
		maxClicks = 80
	}

	for {
		if err := exploreCtx.Err(); err != nil {
			break
		}
		if pagesVisited >= maxPages || clicks >= maxClicks {
			break
		}

		currentURL := pageURL(page)
		if currentURL == "" {
			break
		}
		if !bfs.IsAttackableDiscoveryURL(targetURL, currentURL) {
			_ = page.Navigate(seedURL)
			_ = page.WaitLoad()
			r.settle(exploreCtx)
			continue
		}

		norm, ok := bfs.NormalizeURL(currentURL)
		if !ok {
			norm = currentURL
		}
		if _, seen := visitedPages[norm]; !seen {
			visitedPages[norm] = struct{}{}
			pagesVisited++
			record(contracts.NewAttackVector(currentURL, "GET", "URL_PATH"))
		}

		candidates, err := r.collectClickables(page, currentURL)
		if err != nil {
			r.logger.Warn("collect clickables failed", "url", currentURL, "error", err)
			break
		}

		var next *clickCandidate
		for i := range candidates {
			c := &candidates[i]
			if _, done := clicked[c.Key]; done {
				continue
			}
			next = c
			break
		}
		if next == nil {
			break
		}

		clicked[next.Key] = struct{}{}
		clicks++

		beforeURL := currentURL
		if err := r.clickCandidate(page, *next); err != nil {
			r.logger.Warn("click failed", "text", next.Text, "href", next.Href, "error", err)
			continue
		}
		_ = page.WaitLoad()
		r.settle(exploreCtx)

		afterURL := pageURL(page)
		if afterURL == "" {
			continue
		}
		if looksLikeLoginURL(afterURL) {
			r.logger.Warn("click reached login page; stopping explore",
				"from", beforeURL,
				"to", afterURL,
			)
			break
		}
		if !bfs.IsAttackableDiscoveryURL(targetURL, afterURL) {
			r.logger.Info("click left attackable origin; returning to seed",
				"from", beforeURL,
				"to", afterURL,
			)
			_ = page.Navigate(seedURL)
			_ = page.WaitLoad()
			r.settle(exploreCtx)
			continue
		}
	}

	return finalizeVectors(vectors, r, seedURL, targetURL, pagesVisited, clicks), nil
}

func finalizeVectors(
	vectors map[string]contracts.AttackVector,
	r *RodCrawler,
	seedURL, targetURL string,
	pagesVisited, clicks int,
) []contracts.AttackVector {
	result := make([]contracts.AttackVector, 0, len(vectors))
	for _, v := range vectors {
		result = append(result, v)
	}

	r.logger.Info("dynamic discovery complete",
		"vectors", len(result),
		"pages", pagesVisited,
		"clicks", clicks,
		"seed", seedURL,
		"target", targetURL,
	)
	return result
}

func (r *RodCrawler) exploreBudget() time.Duration {
	settle := r.cfg.ExploreSettle
	if settle <= 0 {
		settle = 1500 * time.Millisecond
	}
	pages := r.cfg.MaxPages
	if pages <= 0 {
		pages = 50
	}
	budget := time.Duration(pages)*settle*3 + r.cfg.BrowserLaunchTimeout
	minBudget := r.cfg.PageTimeout * 2
	if minBudget < 2*time.Minute {
		minBudget = 2 * time.Minute
	}
	if budget < minBudget {
		return minBudget
	}
	return budget
}

func (r *RodCrawler) settle(ctx context.Context) {
	settle := r.cfg.ExploreSettle
	if settle <= 0 {
		settle = 1500 * time.Millisecond
	}
	select {
	case <-ctx.Done():
	case <-time.After(settle):
	}
}

func (r *RodCrawler) collectClickables(page *rod.Page, currentURL string) ([]clickCandidate, error) {
	elements, err := page.Elements(clickableSelector)
	if err != nil {
		return nil, err
	}
	raw := make([]clickCandidate, 0, len(elements))
	limit := len(elements)
	if limit > 100 {
		limit = 100
	}
	for i := 0; i < limit; i++ {
		el := elements[i]
		tag := elementTag(el)
		text := elementText(el)
		href := elementAttr(el, "href")
		role := elementAttr(el, "role")

		raw = append(raw, clickCandidate{
			Index: i,
			Tag:   tag,
			Text:  truncate(text, 80),
			Href:  href,
			Role:  role,
		})
	}
	return rankClickCandidates(currentURL, raw), nil
}

func elementTag(el *rod.Element) string {
	v, err := el.Eval(`() => this.tagName.toLowerCase()`)
	if err != nil || v == nil {
		return ""
	}
	return strings.ToLower(fmt.Sprint(v.Value))
}

func elementText(el *rod.Element) string {
	text, err := el.Text()
	if err == nil && strings.TrimSpace(text) != "" {
		return strings.TrimSpace(text)
	}
	return elementAttr(el, "aria-label")
}

func elementAttr(el *rod.Element, name string) string {
	v, err := el.Attribute(name)
	if err != nil || v == nil {
		return ""
	}
	return *v
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func (r *RodCrawler) clickCandidate(page *rod.Page, candidate clickCandidate) error {
	elements, err := page.Elements(clickableSelector)
	if err != nil {
		return err
	}
	if candidate.Index < 0 || candidate.Index >= len(elements) {
		return fmt.Errorf("click index %d out of range", candidate.Index)
	}
	el := elements[candidate.Index]
	return el.Click(proto.InputMouseButtonLeft, 1)
}

func pageURL(page *rod.Page) string {
	info, err := page.Info()
	if err != nil || info == nil {
		return ""
	}
	return info.URL
}

func looksLikeLoginURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	path := strings.ToLower(parsed.Path)
	return strings.Contains(path, "login") ||
		strings.Contains(path, "signin") ||
		strings.Contains(path, "sign-in") ||
		strings.Contains(path, "/auth") ||
		strings.HasSuffix(path, "/auth") ||
		strings.Contains(path, "inscricao")
}

func (r *RodCrawler) applyStealth(page *rod.Page) error {
	if err := (proto.NetworkSetUserAgentOverride{
		UserAgent:      stealthUserAgent,
		AcceptLanguage: "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
		Platform:       "Windows",
	}).Call(page); err != nil {
		return err
	}
	_, err := page.Eval(`() => {
		Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
		Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
		Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
	}`)
	return err
}

func (r *RodCrawler) launchBrowser(ctx context.Context) (*rod.Browser, func(), error) {
	l := launcher.New().
		Set("disable-blink-features", "AutomationControlled").
		Set("disable-infobars", "true").
		Set("no-first-run", "true").
		Set("no-default-browser-check", "true")

	if r.cfg.RodHeadless {
		// Prefer new headless; classic headless advertises HeadlessChrome in UA.
		l = l.Set("headless", "new")
	} else {
		l = l.Headless(false)
	}

	if r.cfg.ChromePath != "" {
		l = l.Bin(r.cfg.ChromePath)
		r.logger.Info("using system browser for rod", "path", r.cfg.ChromePath)
	}

	if r.cfg.RodNoSandbox {
		l = l.NoSandbox(true)
	}

	controlURL, err := l.Context(ctx).Launch()
	if err != nil {
		return nil, nil, fmt.Errorf("launch browser: %w", err)
	}

	browser := rod.New().ControlURL(controlURL)
	if err := browser.Connect(); err != nil {
		return nil, nil, fmt.Errorf("connect browser: %w", err)
	}

	cleanup := func() {
		_ = browser.Close()
	}
	return browser, cleanup, nil
}

func classifyTargetLocation(method, contentType string) string {
	if strings.Contains(strings.ToLower(contentType), "application/json") {
		return "JSON_BODY"
	}
	if method == http.MethodGet {
		return "QUERY_PARAMETER"
	}
	return "API_ENDPOINT"
}

func mergeJSONParams(vector contracts.AttackVector, body string) {
	var payload map[string]any
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		return
	}
	for key := range payload {
		vector.Params[key] = fmt.Sprintf("%v", payload[key])
	}
}
