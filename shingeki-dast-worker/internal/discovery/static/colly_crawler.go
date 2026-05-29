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

func (c *CollyCrawler) Discover(ctx context.Context, targetURL string) ([]contracts.AttackVector, error) {
	queue := bfs.NewQueue()
	queue.Enqueue(targetURL, 0)

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

		pageVectors, links, err := c.crawlPage(ctx, item.URL)
		if err != nil {
			c.logger.Warn("static crawl failed", "url", item.URL, "error", err)
			continue
		}

		vectors = append(vectors, pageVectors...)
		pagesVisited++

		for _, link := range links {
			if bfs.SameOrigin(targetURL, link) {
				queue.Enqueue(link, item.Depth+1)
			}
		}
	}

	c.logger.Info("static discovery complete",
		"pages", pagesVisited,
		"vectors", len(vectors),
	)

	return vectors, nil
}

func (c *CollyCrawler) crawlPage(ctx context.Context, pageURL string) ([]contracts.AttackVector, []string, error) {
	var vectors []contracts.AttackVector
	var links []string

	coll := colly.NewCollector(
		colly.UserAgent(c.attack.UserAgent),
		colly.MaxDepth(0),
	)
	coll.SetRequestTimeout(c.cfg.PageTimeout)

	coll.OnHTML("a[href]", func(e *colly.HTMLElement) {
		href := strings.TrimSpace(e.Attr("href"))
		if href == "" || strings.HasPrefix(href, "#") || strings.HasPrefix(strings.ToLower(href), "javascript:") {
			return
		}
		if resolved, ok := bfs.ResolveReference(pageURL, href); ok {
			links = append(links, resolved)
			if bfs.SameOrigin(pageURL, resolved) {
				vectors = append(vectors, contracts.NewAttackVector(resolved, "GET", "URL_PATH"))
			}
		}
	})

	coll.OnHTML("form", func(e *colly.HTMLElement) {
		action := strings.TrimSpace(e.Attr("action"))
		if action == "" {
			action = pageURL
		}
		resolved, ok := bfs.ResolveReference(pageURL, action)
		if !ok {
			return
		}

		method := strings.ToUpper(strings.TrimSpace(e.Attr("method")))
		if method == "" {
			method = "GET"
		}

		vector := contracts.NewAttackVector(resolved, method, "FORM")
		e.ForEach("input, textarea, select", func(_ int, el *colly.HTMLElement) {
			name := strings.TrimSpace(el.Attr("name"))
			if name != "" {
				vector.Params[name] = el.Attr("value")
			}
		})
		if len(vector.Params) > 0 {
			vectors = append(vectors, vector)
		}
	})

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
