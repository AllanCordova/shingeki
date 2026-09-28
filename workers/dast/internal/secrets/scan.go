package secrets

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
	"github.com/shingeki/dast-worker/pkg/httputil"
)

const (
	maxBodyBytes   = 512 << 10
	maxFetches     = 40
	requestTimeout = 20 * time.Second
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
	var pages []string
	addPage := func(raw string) {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			return
		}
		if _, ok := seenURL[raw]; ok {
			return
		}
		if !bfs.SameOrigin(targetURL, raw) {
			return
		}
		seenURL[raw] = struct{}{}
		pages = append(pages, raw)
	}

	addPage(strings.TrimRight(strings.TrimSpace(targetURL), "/") + "/")
	for _, extra := range []string{"/api/config", "/preview"} {
		if resolved, ok := bfs.ResolveReference(targetURL, extra); ok {
			addPage(resolved)
		}
	}
	for _, vector := range vectors {
		addPage(vector.Route)
	}

	homeURL := ""
	if len(pages) > 0 {
		homeURL = pages[0]
	}

	var hits []Hit
	fetched := 0
	fetchedOK := 0
	var lastFetchErr error
	var extraScripts []string
	var homeScripts []string
	scriptSeen := map[string]struct{}{}

	scanBody := func(raw, body, reqDump string) {
		for _, match := range Find(body) {
			hits = append(hits, Hit{
				Route:   raw,
				Kind:    match.Kind,
				Value:   match.Value,
				Request: reqDump,
			})
		}
	}

	for _, pageURL := range pages {
		if fetched >= maxFetches {
			break
		}
		body, reqDump, fetchErr := s.get(ctx, pageURL, headers)
		fetched++
		if fetchErr != nil {
			lastFetchErr = fetchErr
			continue
		}
		fetchedOK++
		scanBody(pageURL, body, reqDump)
		if !looksLikeHTML(body) {
			continue
		}
		for _, script := range scriptSources(targetURL, pageURL, body) {
			if _, ok := scriptSeen[script]; ok {
				continue
			}
			if _, ok := seenURL[script]; ok {
				continue
			}
			scriptSeen[script] = struct{}{}
			if pageURL == homeURL {
				homeScripts = append(homeScripts, script)
			} else {
				extraScripts = append(extraScripts, script)
			}
		}
	}

	for _, scriptURL := range append(extraScripts, homeScripts...) {
		if fetched >= maxFetches {
			break
		}
		if _, ok := seenURL[scriptURL]; ok {
			continue
		}
		seenURL[scriptURL] = struct{}{}
		body, reqDump, fetchErr := s.get(ctx, scriptURL, headers)
		fetched++
		if fetchErr != nil {
			lastFetchErr = fetchErr
			continue
		}
		fetchedOK++
		scanBody(scriptURL, body, reqDump)
	}

	if fetchedOK == 0 {
		if lastFetchErr != nil {
			return nil, fmt.Errorf("secret leak scan could not fetch any URL: %w", lastFetchErr)
		}
		return nil, fmt.Errorf("secret leak scan could not fetch any URL from %s", targetURL)
	}

	return dedupeHits(preferHits(hits)), nil
}

func (s *HTTPScanner) get(ctx context.Context, rawURL string, headers map[string]string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Accept", "*/*")
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	res, err := s.client.Do(req)
	if err != nil {
		return "", httputil.DumpRequest(http.MethodGet, rawURL, headerMap(req), ""), err
	}
	defer res.Body.Close()

	limited := io.LimitReader(res.Body, maxBodyBytes+1)
	raw, err := io.ReadAll(limited)
	if err != nil {
		return "", httputil.DumpRequest(http.MethodGet, rawURL, headerMap(req), ""), err
	}
	if len(raw) > maxBodyBytes {
		raw = raw[:maxBodyBytes]
	}
	body := string(raw)
	dump := httputil.DumpRequest(http.MethodGet, rawURL, headerMap(req), httputil.Truncate(body, 2048))
	return body, dump, nil
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

func preferHits(hits []Hit) []Hit {
	out := append([]Hit(nil), hits...)
	sort.SliceStable(out, func(i, j int) bool {
		return routePreference(out[i].Route) > routePreference(out[j].Route)
	})
	return out
}

func routePreference(raw string) int {
	parsed, err := url.Parse(raw)
	path := strings.ToLower(raw)
	if err == nil {
		path = strings.ToLower(parsed.Path)
	}
	switch {
	case strings.Contains(path, "/_next/") || strings.Contains(path, "/static/"):
		return 0
	case strings.HasSuffix(path, ".js"):
		return 1
	case strings.Contains(path, "/api/"):
		return 4
	case strings.Contains(path, "/preview"):
		return 3
	default:
		return 2
	}
}

func dedupeHits(hits []Hit) []Hit {
	seen := map[string]struct{}{}
	out := make([]Hit, 0, len(hits))
	for _, hit := range hits {
		key := hit.Kind + "\x00" + hit.Value
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
