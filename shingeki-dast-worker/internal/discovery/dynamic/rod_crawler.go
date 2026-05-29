package dynamic

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/proto"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
)

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

func (r *RodCrawler) Discover(ctx context.Context, targetURL string) ([]contracts.AttackVector, error) {
	if !r.cfg.RodEnabled {
		return nil, nil
	}

	launchCtx, launchCancel := context.WithTimeout(ctx, r.cfg.BrowserLaunchTimeout)
	defer launchCancel()

	browser, cleanup, err := r.launchBrowser(launchCtx)
	if err != nil {
		return nil, err
	}
	defer cleanup()

	pageCtx, pageCancel := context.WithTimeout(ctx, r.cfg.PageTimeout)
	defer pageCancel()

	page, err := browser.Context(pageCtx).Page(proto.TargetCreateTarget{URL: "about:blank"})
	if err != nil {
		return nil, fmt.Errorf("create page: %w", err)
	}
	defer page.Close()

	vectors := make(map[string]contracts.AttackVector)

	router := page.HijackRequests()
	router.MustAdd("*", func(hctx *rod.Hijack) {
		req := hctx.Request
		method := strings.ToUpper(req.Method())
		route := req.URL().String()

		vector := contracts.NewAttackVector(route, method, classifyTargetLocation(method, req.Header("Content-Type")))
		if body := req.Body(); body != "" {
			vector.Body = body
			mergeJSONParams(vector, body)
		}
		for key, values := range req.URL().Query() {
			if len(values) > 0 {
				vector.Params[key] = values[0]
			}
		}

		key := method + " " + route
		vectors[key] = vector

		if err := hctx.LoadResponse(http.DefaultClient, true); err != nil {
			r.logger.Warn("hijack load response failed", "url", route, "error", err)
			hctx.Response.Fail(proto.NetworkErrorReasonConnectionFailed)
		}
	})

	go router.Run()
	defer router.Stop()

	if err := page.Navigate(targetURL); err != nil {
		return nil, fmt.Errorf("navigate %q: %w", targetURL, err)
	}

	_ = page.WaitLoad()
	select {
	case <-pageCtx.Done():
	case <-time.After(3 * time.Second):
	}

	result := make([]contracts.AttackVector, 0, len(vectors))
	for _, v := range vectors {
		result = append(result, v)
	}

	r.logger.Info("dynamic discovery complete", "vectors", len(result), "target", targetURL)
	return result, nil
}

func (r *RodCrawler) launchBrowser(ctx context.Context) (*rod.Browser, func(), error) {
	l := launcher.New().Headless(r.cfg.RodHeadless)

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
