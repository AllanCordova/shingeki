package dynamic

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
	"github.com/shingeki/dast-worker/pkg/httputil"
)

const clickableSelector = `a[href], button, [role="button"], [role="link"], [onclick], input[type="submit"], input[type="button"]`

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
	auth *contracts.TargetAuth,
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

	connected, err := connectBrowser(launchCtx, r.cfg, r.logger)
	if err != nil {
		return nil, err
	}
	browser := connected.browser
	defer connected.cleanup()

	exploreTimeout := r.exploreBudget()
	exploreCtx, exploreCancel := context.WithTimeout(ctx, exploreTimeout)
	defer exploreCancel()

	page, err := browser.Context(exploreCtx).Page(proto.TargetCreateTarget{URL: "about:blank"})
	if err != nil {
		return nil, fmt.Errorf("create page: %w", err)
	}
	defer page.Close()

	userAgent := ""
	if auth != nil {
		userAgent = auth.UserAgent
	}
	if err := applyStealth(page, userAgent); err != nil {
		r.logger.Warn("stealth profile incomplete", "error", err)
	}

	var mu sync.Mutex
	vectors := make(map[string]contracts.AttackVector)
	record := func(vector contracts.AttackVector) {
		if !bfs.IsAttackableDiscoveryURL(targetURL, vector.Route) {
			return
		}
		key := vector.Method + " " + vector.Route + " " + vector.TargetLocation
		mu.Lock()
		vectors[key] = vector
		mu.Unlock()
	}

	if err := (proto.NetworkEnable{}).Call(page); err != nil {
		return nil, fmt.Errorf("enable network domain: %w", err)
	}
	go page.EachEvent(func(e *proto.NetworkRequestWillBeSent) {
		if e == nil || e.Request == nil {
			return
		}
		contentType := headerFromNetwork(e.Request.Headers, "Content-Type")
		vector, ok := networkVector(targetURL, e.Request.Method, e.Request.URL, contentType, e.Request.PostData)
		if ok {
			record(vector)
		}
	})()

	authHeaders := contracts.EffectiveAuthHeaders(auth)
	if err := injectBrowserAuth(browser, page, targetURL, seedURL, auth); err != nil {
		r.logger.Warn("browser auth injection incomplete", "error", err)
	} else if hasSessionAuth(auth) {
		storage := (*contracts.TargetStorage)(nil)
		if auth != nil {
			storage = auth.Storage
		}
		r.logger.Info("applied target session for dynamic discovery",
			"has_cookie_header", hasCookieAuth(auth),
			"has_authorization", headerValue(authHeaders, "Authorization") != "",
			"has_storage", storage != nil && (len(storage.Local) > 0 || len(storage.Session) > 0 || len(storage.Origins) > 0),
			"structured_cookies", auth != nil && len(auth.Cookies) > 0,
			"recorded_routes", auth != nil && len(auth.Routes) > 0,
			"has_user_agent", userAgent != "",
		)
	} else {
		r.logger.Warn("dynamic discovery running without auth; authenticated SPA routes may redirect to login")
	}

	queue := bfs.NewQueue()
	queue.Enqueue(seedURL, 0)
	if auth != nil {
		for _, route := range auth.Routes {
			rawURL := strings.TrimSpace(route.URL)
			if rawURL == "" || !bfs.IsAttackableDiscoveryURL(targetURL, rawURL) {
				continue
			}
			queue.Enqueue(rawURL, 0)
		}
	}

	clicked := make(map[string]struct{})
	submitted := make(map[string]struct{})
	pagesVisited := 0
	clicks := 0
	formSubmits := 0
	hasSession := hasSessionAuth(auth)

	maxPages := r.cfg.MaxPages
	if maxPages <= 0 {
		maxPages = 50
	}
	maxClicks := r.cfg.MaxClicks
	if maxClicks <= 0 {
		maxClicks = 80
	}
	maxForms := r.cfg.MaxFormSubmits
	if maxForms <= 0 {
		maxForms = 8
	}

	for {
		if err := exploreCtx.Err(); err != nil {
			break
		}
		if pagesVisited >= maxPages {
			break
		}

		item, ok := queue.Dequeue()
		if !ok {
			break
		}
		if item.Depth > r.cfg.MaxDepth {
			continue
		}

		if err := page.Navigate(item.URL); err != nil {
			r.logger.Warn("navigate failed", "url", item.URL, "error", err)
			continue
		}
		_ = page.WaitLoad()
		r.settle(exploreCtx)

		currentURL := pageURL(page)
		if currentURL == "" {
			continue
		}
		if looksLikeLoginURL(currentURL) && hasSession {
			r.logger.Warn("page looks like login; session replay may have been rejected — continuing with recorded routes",
				"seed", item.URL,
				"landed", currentURL,
			)
			record(contracts.NewAttackVector(currentURL, "GET", "URL_PATH"))
			continue
		}
		if !bfs.IsAttackableDiscoveryURL(targetURL, currentURL) {
			continue
		}

		pagesVisited++
		record(contracts.NewAttackVector(currentURL, "GET", "URL_PATH"))

		for _, link := range r.collectLinks(page, currentURL) {
			if bfs.IsAttackableDiscoveryURL(targetURL, link) {
				queue.Enqueue(link, item.Depth+1)
			}
		}

		candidates, err := r.collectClickables(page, currentURL)
		if err != nil {
			r.logger.Warn("collect clickables failed", "url", currentURL, "error", err)
		} else {
			for _, candidate := range candidates {
				if exploreCtx.Err() != nil || clicks >= maxClicks {
					break
				}
				if _, done := clicked[candidate.Key]; done {
					continue
				}
				clicked[candidate.Key] = struct{}{}
				clicks++

				if href := strings.TrimSpace(candidate.Href); href != "" && !hasPrefixFold(href, "#") {
					if resolved, ok := bfs.ResolveReference(currentURL, href); ok {
						if bfs.IsAttackableDiscoveryURL(targetURL, resolved) {
							queue.Enqueue(resolved, item.Depth+1)
						}
					}
				}

				if err := r.clickCandidate(page, candidate); err != nil {
					r.logger.Warn("click failed", "text", candidate.Text, "href", candidate.Href, "error", err)
					_ = page.Navigate(currentURL)
					_ = page.WaitLoad()
					r.settle(exploreCtx)
					continue
				}
				_ = page.WaitLoad()
				r.settle(exploreCtx)

				afterURL := pageURL(page)
				if afterURL == "" {
					continue
				}
				if looksLikeLoginURL(afterURL) && hasSession {
					r.logger.Warn("click reached login page; returning to previous page",
						"from", currentURL,
						"to", afterURL,
					)
					record(contracts.NewAttackVector(afterURL, "GET", "URL_PATH"))
					_ = page.Navigate(currentURL)
					_ = page.WaitLoad()
					r.settle(exploreCtx)
					continue
				}
				if bfs.IsAttackableDiscoveryURL(targetURL, afterURL) {
					queue.Enqueue(afterURL, item.Depth+1)
				}
				if afterURL != currentURL {
					_ = page.Navigate(currentURL)
					_ = page.WaitLoad()
					r.settle(exploreCtx)
				}
			}
		}

		forms, err := r.collectForms(page)
		if err != nil {
			r.logger.Warn("collect forms failed", "url", currentURL, "error", err)
			continue
		}
		for _, form := range forms {
			if exploreCtx.Err() != nil || formSubmits >= maxForms {
				break
			}
			key := formKey(form)
			if _, done := submitted[key]; done {
				continue
			}
			if shouldSkipForm(form, hasSession) {
				continue
			}
			submitted[key] = struct{}{}
			formSubmits++
			if err := r.submitForm(page, form); err != nil {
				r.logger.Warn("form submit failed", "action", form.Action, "error", err)
			}
			_ = page.WaitLoad()
			r.settle(exploreCtx)
			afterURL := pageURL(page)
			if afterURL != "" && bfs.IsAttackableDiscoveryURL(targetURL, afterURL) {
				queue.Enqueue(afterURL, item.Depth+1)
			}
			if afterURL != currentURL {
				_ = page.Navigate(currentURL)
				_ = page.WaitLoad()
				r.settle(exploreCtx)
			}
		}
	}

	return finalizeVectors(vectors, &mu, r, seedURL, targetURL, pagesVisited, clicks), nil
}

func finalizeVectors(
	vectors map[string]contracts.AttackVector,
	mu *sync.Mutex,
	r *RodCrawler,
	seedURL, targetURL string,
	pagesVisited, clicks int,
) []contracts.AttackVector {
	mu.Lock()
	result := make([]contracts.AttackVector, 0, len(vectors))
	for _, v := range vectors {
		result = append(result, v)
	}
	mu.Unlock()

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

func (r *RodCrawler) collectLinks(page *rod.Page, currentURL string) []string {
	elements, err := page.Elements("a[href]")
	if err != nil {
		return nil
	}
	out := make([]string, 0, len(elements))
	limit := len(elements)
	if limit > 100 {
		limit = 100
	}
	for i := 0; i < limit; i++ {
		href := elementAttr(elements[i], "href")
		if href == "" || hasPrefixFold(href, "javascript:") || hasPrefixFold(href, "#") {
			continue
		}
		resolved, ok := bfs.ResolveReference(currentURL, href)
		if !ok {
			continue
		}
		out = append(out, resolved)
	}
	return out
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
		raw = append(raw, clickCandidate{
			Index: i,
			Tag:   elementTag(el),
			Text:  truncate(elementText(el), 80),
			Href:  elementAttr(el, "href"),
			Role:  elementAttr(el, "role"),
		})
	}
	return rankClickCandidates(currentURL, raw), nil
}

func (r *RodCrawler) collectForms(page *rod.Page) ([]formCandidate, error) {
	res, err := page.Eval(`() => {
		return [...document.querySelectorAll('form')].slice(0, 20).map((form, index) => ({
			index,
			action: form.getAttribute('action') || form.action || '',
			method: (form.getAttribute('method') || form.method || 'GET'),
			text: [form.getAttribute('aria-label'), form.id, form.getAttribute('name')].filter(Boolean).join(' '),
			hasPassword: Boolean(form.querySelector('input[type="password"]')),
			fields: [...form.querySelectorAll('input, textarea, select')].map((el) => ({
				name: el.getAttribute('name') || el.id || '',
				type: (el.getAttribute('type') || el.tagName || '').toLowerCase(),
				autocomplete: el.getAttribute('autocomplete') || '',
				tag: el.tagName.toLowerCase(),
			}))
		}));
	}`)
	if err != nil || res == nil {
		return nil, err
	}

	var forms []formCandidate
	if err := res.Value.Unmarshal(&forms); err != nil {
		return nil, err
	}
	return forms, nil
}

func (r *RodCrawler) submitForm(page *rod.Page, form formCandidate) error {
	values := map[string]string{}
	for _, field := range form.Fields {
		value, ok := fillValueForField(field)
		if !ok || strings.TrimSpace(field.Name) == "" {
			continue
		}
		values[field.Name] = value
	}

	_, err := page.Eval(`(index, values) => {
		const form = document.querySelectorAll('form')[index];
		if (!form) throw new Error('form not found');
		for (const [name, value] of Object.entries(values || {})) {
			const el = form.querySelector('[name="' + CSS.escape(name) + '"]');
			if (!el) continue;
			const tag = (el.tagName || '').toLowerCase();
			const type = (el.getAttribute('type') || '').toLowerCase();
			if (tag === 'select') {
				if (el.options && el.options.length) {
					el.selectedIndex = el.options[0].value === '' && el.options.length > 1 ? 1 : 0;
				}
				el.dispatchEvent(new Event('change', { bubbles: true }));
				continue;
			}
			if (type === 'checkbox' || type === 'radio') {
				el.checked = true;
				el.dispatchEvent(new Event('change', { bubbles: true }));
				continue;
			}
			el.value = value;
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		}
		if (typeof form.requestSubmit === 'function') {
			form.requestSubmit();
		} else {
			form.submit();
		}
	}`, form.Index, values)
	return err
}

func formKey(form formCandidate) string {
	return fmt.Sprintf("%s|%s|%s|%d", form.Method, form.Action, form.Text, form.Index)
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
	return httputil.Truncate(strings.TrimSpace(s), n)
}

func (r *RodCrawler) clickCandidate(page *rod.Page, candidate clickCandidate) error {
	currentURL := pageURL(page)
	live, err := r.collectClickables(page, currentURL)
	if err != nil {
		return err
	}
	idx := candidate.Index
	for _, item := range live {
		if item.Key == candidate.Key {
			idx = item.Index
			break
		}
	}
	elements, err := page.Elements(clickableSelector)
	if err != nil {
		return err
	}
	if idx < 0 || idx >= len(elements) {
		return fmt.Errorf("click target %q not found", candidate.Key)
	}
	return elements[idx].Click(proto.InputMouseButtonLeft, 1)
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
	path := strings.ToLower(strings.Trim(parsed.Path, "/"))
	if path == "" {
		return false
	}
	segments := strings.Split(path, "/")
	last := segments[len(segments)-1]
	last = strings.TrimSuffix(last, ".php")
	last = strings.TrimSuffix(last, ".html")
	last = strings.TrimSuffix(last, ".htm")
	switch last {
	case "login", "signin", "sign-in", "log-in", "inscricao":
		return true
	default:
		return false
	}
}

func headerFromNetwork(headers proto.NetworkHeaders, name string) string {
	if headers == nil {
		return ""
	}
	if v, ok := headers[name]; ok {
		return v.String()
	}
	if v, ok := headers[strings.ToLower(name)]; ok {
		return v.String()
	}
	return ""
}

func hasPrefixFold(s, prefix string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(s)), strings.ToLower(prefix))
}
