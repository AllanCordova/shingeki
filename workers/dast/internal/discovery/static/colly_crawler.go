package static

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"strings"
	"time"

	"github.com/gocolly/colly/v2"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
)

type CollyCrawler struct {
	cfg    config.DiscoveryConfig
	attack config.AttackConfig
	logger *slog.Logger
}

func NewCollyCrawler(discoveryCfg config.DiscoveryConfig, attackCfg config.AttackConfig, logger *slog.Logger) *CollyCrawler {
	if logger == nil {
		logger = slog.Default()
	}
	return &CollyCrawler{cfg: discoveryCfg, attack: attackCfg, logger: logger}
}

func (c *CollyCrawler) Discover(
	ctx context.Context,
	targetURL string,
	authHeaders map[string]string,
	seedURL string,
) ([]contracts.AttackVector, error) {
	if strings.TrimSpace(seedURL) == "" {
		seedURL = targetURL
	}

	queue := bfs.NewQueue()
	queue.Enqueue(seedURL, 0)

	var vectors []contracts.AttackVector
	pagesVisited := 0

	for queue.Len() > 0 {
		if err := ctx.Err(); err != nil {
			return vectors, err
		}
		if pagesVisited >= c.cfg.MaxPages {
			break
		}

		item, ok := queue.Dequeue()
		if !ok {
			break
		}
		if item.Depth > c.cfg.MaxDepth {
			continue
		}

		pageVectors, links, err := c.crawlPage(ctx, item.URL, authHeaders)
		if err != nil {
			c.logger.Warn("static crawl failed", "url", item.URL, "error", err)
			continue
		}

		vectors = append(vectors, pageVectors...)
		pagesVisited++

		for _, link := range links {
			if !bfs.IsAttackableDiscoveryURL(targetURL, link) {
				continue
			}
			queue.Enqueue(link, item.Depth+1)
		}
	}

	c.logger.Info("static discovery complete",
		"seed", seedURL,
		"pages", pagesVisited,
		"vectors", len(vectors),
	)

	return vectors, nil
}

func (c *CollyCrawler) crawlPage(ctx context.Context, pageURL string, authHeaders map[string]string) ([]contracts.AttackVector, []string, error) {
	var vectors []contracts.AttackVector
	var links []string

	coll := colly.NewCollector(
		colly.UserAgent(c.attack.UserAgent),
		colly.MaxDepth(0),
	)
	coll.SetRequestTimeout(c.cfg.PageTimeout)

	coll.OnRequest(func(r *colly.Request) {
		for key, value := range authHeaders {
			r.Headers.Set(key, value)
		}
	})

	coll.OnHTML("a[href]", func(e *colly.HTMLElement) {
		href := strings.TrimSpace(e.Attr("href"))
		if href == "" || strings.HasPrefix(href, "#") || strings.HasPrefix(strings.ToLower(href), "javascript:") {
			return
		}
		if resolved, ok := bfs.ResolveReference(pageURL, href); ok {
			if bfs.IsBlockedDiscoveryURL(resolved) {
				return
			}
			links = append(links, resolved)
		}
	})

	coll.OnHTML("form", func(e *colly.HTMLElement) {
		action := strings.TrimSpace(e.Attr("action"))
		if action == "" {
			action = pageURL
		}
		resolved, ok := bfs.ResolveReference(pageURL, action)
		if !ok || !bfs.SameOrigin(pageURL, resolved) {
			return
		}

		method := strings.ToUpper(strings.TrimSpace(e.Attr("method")))
		if method == "" {
			method = defaultFormMethod(e)
		}

		params := map[string]string{}
		e.ForEach("input, textarea, select", func(_ int, el *colly.HTMLElement) {
			name := strings.TrimSpace(el.Attr("name"))
			if name != "" {
				params[name] = el.Attr("value")
			}
		})
		if vector, ok := formVector(resolved, method, params); ok {
			vectors = append(vectors, vector)
		}
	})

	vectors = append(vectors, contracts.NewAttackVector(pageURL, "GET", "URL_PATH"))

	parsed, err := url.Parse(pageURL)
	if err == nil && parsed.RawQuery != "" {
		vector := contracts.NewAttackVector(pageURL, "GET", "QUERY_PARAMETER")
		for key := range parsed.Query() {
			vector.Params[key] = parsed.Query().Get(key)
		}
		vectors = append(vectors, vector)
	}

	done := make(chan error, 1)
	go func() {
		done <- coll.Visit(pageURL)
	}()

	select {
	case <-ctx.Done():
		coll.Wait()
		return vectors, links, ctx.Err()
	case err := <-done:
		if err != nil {
			return vectors, links, fmt.Errorf("visit %q: %w", pageURL, err)
		}
	case <-time.After(c.cfg.PageTimeout + 5*time.Second):
		coll.Wait()
		return vectors, links, fmt.Errorf("visit %q: timeout", pageURL)
	}

	coll.Wait()
	return vectors, links, nil
}

func formVector(resolved, method string, params map[string]string) (contracts.AttackVector, bool) {
	if len(params) == 0 {
		return contracts.AttackVector{}, false
	}
	if method == "" {
		method = "POST"
	}
	location := contracts.FormTargetLocation(method)
	route := resolved
	if location == "QUERY_PARAMETER" {
		route = contracts.WithQueryParams(resolved, params)
	}
	vector := contracts.NewAttackVector(route, method, location)
	for key, value := range params {
		vector.Params[key] = value
	}
	return vector, true
}

func defaultFormMethod(form *colly.HTMLElement) string {
	hasPassword := false
	form.ForEach("input", func(_ int, el *colly.HTMLElement) {
		if strings.EqualFold(strings.TrimSpace(el.Attr("type")), "password") {
			hasPassword = true
		}
	})
	if hasPassword {
		return "POST"
	}
	return "GET"
}
