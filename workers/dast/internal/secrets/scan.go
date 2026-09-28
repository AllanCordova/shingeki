package secrets

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
	"github.com/shingeki/dast-worker/pkg/httputil"
)

const (
	maxBodyBytes   = 512 << 10
	maxFetches     = 40
	requestTimeout = 12 * time.Second
)

var scriptSrcPattern = regexp.MustCompile(`(?i)<script[^>]+src=["']([^"']+)["']`)

type Hit struct {
	Route   string
	Kind    string
	Value   string
	Request string
}

type Scanner interface {
	Scan(ctx context.Context, targetURL string, vectors []contracts.AttackVector, auth *contracts.TargetAuth) ([]Hit, error)
}

type HTTPScanner struct {
	client *http.Client
}

func NewHTTPScanner() *HTTPScanner {
	return &HTTPScanner{
		client: &http.Client{Timeout: requestTimeout, CheckRedirect: httputil.CheckSameOriginRedirect},
	}
}

func (s *HTTPScanner) Scan(
	ctx context.Context,
	targetURL string,
	vectors []contracts.AttackVector,
	auth *contracts.TargetAuth,
) ([]Hit, error) {
	if s == nil || s.client == nil {
		s = NewHTTPScanner()
	}

	headers := contracts.EffectiveAuthHeaders(auth)
	seenURL := map[string]struct{}{}
	var hits []Hit
	fetched := 0

	var enqueue func(raw string)
	enqueue = func(raw string) {
		raw = strings.TrimSpace(raw)
		if raw == "" || fetched >= maxFetches {
			return
		}
		if _, ok := seenURL[raw]; ok {
			return
		}
		if !bfs.SameOrigin(targetURL, raw) {
			return
		}
		seenURL[raw] = struct{}{}
		body, reqDump, ok := s.get(ctx, raw, headers)
		fetched++
		if !ok {
			return
		}
		for _, match := range Find(body) {
			hits = append(hits, Hit{
				Route:   raw,
				Kind:    match.Kind,
				Value:   match.Value,
				Request: reqDump,
			})
		}
		if looksLikeHTML(body) {
			for _, script := range scriptSources(targetURL, raw, body) {
				enqueue(script)
			}
		}
	}

	enqueue(strings.TrimRight(strings.TrimSpace(targetURL), "/") + "/")
	for _, extra := range []string{"/api/config", "/preview"} {
		if resolved, ok := bfs.ResolveReference(targetURL, extra); ok {
			enqueue(resolved)
		}
	}
	for _, vector := range vectors {
		enqueue(vector.Route)
	}

	return dedupeHits(hits), nil
}

func (s *HTTPScanner) get(ctx context.Context, rawURL string, headers map[string]string) (string, string, bool) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", "", false
	}
	req.Header.Set("Accept", "*/*")
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	res, err := s.client.Do(req)
	if err != nil {
		return "", httputil.DumpRequest(http.MethodGet, rawURL, headerMap(req), ""), false
	}
	defer res.Body.Close()

	limited := io.LimitReader(res.Body, maxBodyBytes+1)
	raw, err := io.ReadAll(limited)
	if err != nil {
		return "", httputil.DumpRequest(http.MethodGet, rawURL, headerMap(req), ""), false
	}
	if len(raw) > maxBodyBytes {
		raw = raw[:maxBodyBytes]
	}
	body := string(raw)
	dump := httputil.DumpRequest(http.MethodGet, rawURL, headerMap(req), httputil.Truncate(body, 2048))
	return body, dump, true
}

func headerMap(req *http.Request) map[string]string {
	out := map[string]string{}
	for key := range req.Header {
		out[key] = req.Header.Get(key)
	}
	return out
}

func scriptSources(targetURL, pageURL, html string) []string {
	var out []string
	for _, match := range scriptSrcPattern.FindAllStringSubmatch(html, 20) {
		if len(match) < 2 {
			continue
		}
		src := strings.TrimSpace(match[1])
		if src == "" {
			continue
		}
		resolved, ok := bfs.ResolveReference(pageURL, src)
		if !ok || !bfs.SameOrigin(targetURL, resolved) {
			continue
		}
		if parsed, err := url.Parse(resolved); err == nil {
			path := strings.ToLower(parsed.Path)
			if !strings.HasSuffix(path, ".js") && !strings.Contains(path, "/_next/static/") {
				continue
			}
		}
		out = append(out, resolved)
	}
	return out
}

func looksLikeHTML(body string) bool {
	lower := strings.ToLower(body)
	return strings.Contains(lower, "<html") || strings.Contains(lower, "<script") || strings.Contains(lower, "<!doctype")
}

func dedupeHits(hits []Hit) []Hit {
	seen := map[string]struct{}{}
	out := make([]Hit, 0, len(hits))
	for _, hit := range hits {
		key := hit.Kind + "\x00" + hit.Route + "\x00" + hit.Value
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, hit)
	}
	return out
}

func Evidence(hit Hit) string {
	return fmt.Sprintf("%s leaked in browser-reachable response at %s: %s", hit.Kind, hit.Route, TruncateValue(hit.Value))
}
