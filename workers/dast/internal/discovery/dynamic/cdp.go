package dynamic

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"

	"github.com/shingeki/dast-worker/internal/config"
)

type connectedBrowser struct {
	browser  *rod.Browser
	cleanup  func()
	attached bool
}

func connectBrowser(ctx context.Context, cfg config.DiscoveryConfig, logger interface {
	Info(string, ...any)
	Warn(string, ...any)
}) (*connectedBrowser, error) {
	if strings.TrimSpace(cfg.CDPURL) != "" {
		connected, err := attachCDP(ctx, cfg.CDPURL, logger)
		if err == nil {
			return connected, nil
		}
		logger.Warn("cdp attach failed; launching container chromium", "error", err)
	}

	return launchChromium(ctx, cfg, logger)
}

func attachCDP(ctx context.Context, cdpURL string, logger interface {
	Info(string, ...any)
}) (*connectedBrowser, error) {
	controlURL, err := resolveCDPControlURL(ctx, cdpURL)
	if err != nil {
		return nil, err
	}
	browser := rod.New().ControlURL(controlURL)
	if err := browser.Connect(); err != nil {
		return nil, fmt.Errorf("connect cdp browser: %w", err)
	}
	logger.Info("attached to existing chrome via cdp")
	isolated, err := browser.Incognito()
	if err != nil {
		return nil, fmt.Errorf("incognito context: %w", err)
	}
	return &connectedBrowser{
		browser:  isolated,
		attached: true,
		cleanup: func() {
			_ = isolated.Close()
		},
	}, nil
}

func launchChromium(ctx context.Context, cfg config.DiscoveryConfig, logger interface {
	Info(string, ...any)
}) (*connectedBrowser, error) {
	l := launcher.New().
		Set("disable-blink-features", "AutomationControlled").
		Set("disable-infobars", "true").
		Set("no-first-run", "true").
		Set("no-default-browser-check", "true")

	if cfg.RodHeadless {
		l = l.Set("headless", "new")
	} else {
		l = l.Headless(false)
	}
	if cfg.ChromePath != "" {
		l = l.Bin(cfg.ChromePath)
		logger.Info("using system browser for rod", "path", cfg.ChromePath)
	}
	if cfg.RodNoSandbox {
		l = l.NoSandbox(true)
	}
	if proxy := strings.TrimSpace(cfg.Proxy); proxy != "" {
		l = l.Set("proxy-server", proxy)
		logger.Info("using discovery proxy")
	}

	controlURL, err := l.Context(ctx).Launch()
	if err != nil {
		return nil, fmt.Errorf("launch browser: %w", err)
	}
	browser := rod.New().ControlURL(controlURL)
	if err := browser.Connect(); err != nil {
		l.Cleanup()
		return nil, fmt.Errorf("connect browser: %w", err)
	}
	return &connectedBrowser{
		browser: browser,
		cleanup: func() {
			_ = browser.Close()
			l.Cleanup()
		},
	}, nil
}

func resolveCDPControlURL(ctx context.Context, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if strings.HasPrefix(raw, "ws://") || strings.HasPrefix(raw, "wss://") {
		return raw, nil
	}
	base := raw
	if !strings.Contains(base, "://") {
		base = "http://" + base
	}
	parsed, err := url.Parse(base)
	if err != nil {
		return "", fmt.Errorf("invalid DISCOVERY_CDP_URL: %w", err)
	}
	versionURL := strings.TrimRight(parsed.String(), "/") + "/json/version"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, versionURL, nil)
	if err != nil {
		return "", err
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("cdp version endpoint: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", err
	}
	var payload struct {
		WebSocketDebuggerURL string `json:"webSocketDebuggerUrl"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", fmt.Errorf("decode cdp version: %w", err)
	}
	ws := strings.TrimSpace(payload.WebSocketDebuggerURL)
	if ws == "" {
		return "", fmt.Errorf("cdp version missing webSocketDebuggerUrl")
	}
	return rewriteDebuggerHost(ws, parsed), nil
}

func rewriteDebuggerHost(wsURL string, cdpBase *url.URL) string {
	parsed, err := url.Parse(wsURL)
	if err != nil || cdpBase == nil {
		return wsURL
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "127.0.0.1" || host == "localhost" || host == "::1" {
		parsed.Host = cdpBase.Host
	}
	return parsed.String()
}
