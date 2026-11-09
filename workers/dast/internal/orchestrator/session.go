package orchestrator

import (
	"context"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/httputil"
)

type sessionGuard interface {
	Establish(ctx context.Context, targetURL string, auth *contracts.TargetAuth, candidates []string) (string, error)
	Expired(ctx context.Context, targetURL, controlURL string, auth *contracts.TargetAuth) (bool, error)
}

type httpSessionGuard struct {
	client *http.Client
}

func newHTTPSessionGuard() *httpSessionGuard {
	return &httpSessionGuard{
		client: &http.Client{
			Timeout:       15 * time.Second,
			CheckRedirect: httputil.CheckSameOriginRedirect,
		},
	}
}

func (g *httpSessionGuard) Establish(ctx context.Context, targetURL string, auth *contracts.TargetAuth, candidates []string) (string, error) {
	seen := map[string]struct{}{}
	sawDenied := false
	checked := 0
	for _, rawURL := range candidates {
		rawURL = strings.TrimSpace(rawURL)
		if rawURL == "" {
			continue
		}
		if _, exists := seen[rawURL]; exists {
			continue
		}
		seen[rawURL] = struct{}{}
		if !contracts.HostInScope(targetURL, rawURL) {
			continue
		}
		if checked >= 30 {
			break
		}
		checked++
		status, err := g.get(ctx, targetURL, rawURL, auth)
		if err != nil {
			continue
		}
		if status >= 200 && status < 300 {
			return rawURL, nil
		}
		if status == http.StatusUnauthorized || status == http.StatusForbidden {
			sawDenied = true
		}
	}
	if sawDenied {
		return "", contracts.ErrSessionExpired
	}
	return "", nil
}

func (g *httpSessionGuard) Expired(ctx context.Context, targetURL, controlURL string, auth *contracts.TargetAuth) (bool, error) {
	status, err := g.get(ctx, targetURL, controlURL, auth)
	if err != nil {
		return false, err
	}
	return status == http.StatusUnauthorized || status == http.StatusForbidden, nil
}

func (g *httpSessionGuard) get(ctx context.Context, targetURL, rawURL string, auth *contracts.TargetAuth) (int, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return 0, err
	}
	for key, value := range contracts.HeadersForURL(auth, targetURL, rawURL) {
		request.Header.Set(key, value)
	}
	response, err := g.client.Do(request)
	if err != nil {
		return 0, err
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
	return response.StatusCode, nil
}
