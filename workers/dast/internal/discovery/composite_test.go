package discovery

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
)

type stubCrawl struct {
	name    string
	vectors []contracts.AttackVector
	err     error
	calls   int
}

func (s *stubCrawl) Discover(
	_ context.Context,
	_ string,
	_ *contracts.TargetAuth,
	_ string,
) ([]contracts.AttackVector, error) {
	s.calls++
	return s.vectors, s.err
}

func TestCompositeUsesRodFirst(t *testing.T) {
	rod := &stubCrawl{name: "rod", vectors: []contracts.AttackVector{
		contracts.NewAttackVector("https://app.example/api/v1/produtos", "POST", "JSON_BODY"),
	}}
	colly := &stubCrawl{name: "colly", vectors: []contracts.AttackVector{
		contracts.NewAttackVector("https://app.example/", "GET", "URL_PATH"),
	}}

	engine := &CompositeEngine{
		cfg: config.Config{
			Discovery: config.DiscoveryConfig{
				MaxPages:   50,
				RodEnabled: true,
			},
		},
		logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
		static:  colly,
		dynamic: rod,
	}

	vectors, err := engine.Discover(context.Background(), "https://app.example", nil, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rod.calls != 1 {
		t.Fatalf("expected rod to run, calls=%d", rod.calls)
	}
	if colly.calls != 0 {
		t.Fatalf("colly should not run when rod succeeds, calls=%d", colly.calls)
	}
	if len(vectors) != 1 || vectors[0].Method != "POST" {
		t.Fatalf("expected rod vectors, got %+v", vectors)
	}
}

func TestCompositeFallsBackToStaticWhenRodFails(t *testing.T) {
	rod := &stubCrawl{err: errors.New("chrome missing")}
	colly := &stubCrawl{vectors: []contracts.AttackVector{
		contracts.NewAttackVector("https://app.example/login.php", "POST", "FORM"),
	}}

	engine := &CompositeEngine{
		cfg: config.Config{
			Discovery: config.DiscoveryConfig{
				MaxPages:   50,
				RodEnabled: true,
			},
		},
		logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
		static:  colly,
		dynamic: rod,
	}

	vectors, err := engine.Discover(context.Background(), "https://app.example", nil, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rod.calls != 1 || colly.calls != 1 {
		t.Fatalf("expected rod then colly, rod=%d colly=%d", rod.calls, colly.calls)
	}
	if len(vectors) != 1 || vectors[0].TargetLocation != "FORM" {
		t.Fatalf("expected static vectors, got %+v", vectors)
	}
}

func TestCompositeMergesStaticWhenRodReturnsNothing(t *testing.T) {
	rod := &stubCrawl{}
	colly := &stubCrawl{vectors: []contracts.AttackVector{
		contracts.NewAttackVector("https://app.example/login.php", "POST", "FORM"),
	}}

	engine := &CompositeEngine{
		cfg: config.Config{
			Discovery: config.DiscoveryConfig{
				MaxPages:         50,
				RodEnabled:       true,
				MinVectorsForRod: 2,
			},
		},
		logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
		static:  colly,
		dynamic: rod,
	}

	vectors, err := engine.Discover(context.Background(), "https://app.example", nil, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rod.calls != 1 || colly.calls != 1 {
		t.Fatalf("expected rod then colly, rod=%d colly=%d", rod.calls, colly.calls)
	}
	if len(vectors) != 1 || vectors[0].TargetLocation != "FORM" {
		t.Fatalf("expected merged static vectors, got %+v", vectors)
	}
}

func TestCompositeIgnoresCredentialsWithoutACapturedSession(t *testing.T) {
	rod := &stubCrawl{vectors: []contracts.AttackVector{
		contracts.NewAttackVector("http://127.0.0.1:1/", "GET", "URL_PATH"),
	}}
	engine := &CompositeEngine{
		cfg: config.Config{
			Discovery: config.DiscoveryConfig{
				MaxPages:   50,
				RodEnabled: true,
			},
		},
		logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
		static:  &stubCrawl{},
		dynamic: rod,
	}

	auth := &contracts.TargetAuth{Type: "credentials", Username: "user", Password: "pass"}
	vectors, err := engine.Discover(context.Background(), "http://127.0.0.1:1", auth, Options{})
	if err != nil {
		t.Fatalf("credentials must not fail discovery: %v", err)
	}
	if rod.calls != 1 {
		t.Fatalf("rod calls=%d", rod.calls)
	}
	if len(vectors) == 0 {
		t.Fatal("expected discovery vectors")
	}
}

func TestCompositeDoesNotFallbackWhenRodReportsScannerLoginFailure(t *testing.T) {
	rod := &stubCrawl{err: fmt.Errorf("%w: no login form found", contracts.ErrScannerLogin)}
	colly := &stubCrawl{vectors: []contracts.AttackVector{
		contracts.NewAttackVector("http://127.0.0.1:1/login.php", "POST", "FORM"),
	}}
	engine := &CompositeEngine{
		cfg: config.Config{
			Discovery: config.DiscoveryConfig{
				MaxPages:   50,
				RodEnabled: true,
			},
		},
		logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
		static:  colly,
		dynamic: rod,
	}

	auth := &contracts.TargetAuth{Type: "credentials", Username: "user", Password: "pass"}
	_, err := engine.Discover(context.Background(), "http://127.0.0.1:1", auth, Options{})
	if !errors.Is(err, contracts.ErrScannerLogin) {
		t.Fatalf("got %v", err)
	}
	if colly.calls != 0 {
		t.Fatalf("static crawl must not run after login failure, calls=%d", colly.calls)
	}
}

func TestCompositeRouteMapSkipsCrawl(t *testing.T) {
	rod := &stubCrawl{vectors: []contracts.AttackVector{
		contracts.NewAttackVector("https://api.example/secret", "GET", "URL_PATH"),
	}}
	colly := &stubCrawl{vectors: []contracts.AttackVector{
		contracts.NewAttackVector("https://api.example/", "GET", "URL_PATH"),
	}}
	engine := &CompositeEngine{
		cfg: config.Config{
			Discovery: config.DiscoveryConfig{RodEnabled: true, MaxPages: 50},
		},
		logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
		static:  colly,
		dynamic: rod,
	}

	vectors, err := engine.Discover(context.Background(), "https://api.example", nil, Options{
		RouteMap: []contracts.DispatchRoute{
			{Method: "GET", Path: "/api/v1/user"},
			{Method: "GET", Path: "/api/v1/product"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rod.calls != 0 || colly.calls != 0 {
		t.Fatalf("route map must skip crawl, rod=%d colly=%d", rod.calls, colly.calls)
	}
	if len(vectors) != 2 {
		t.Fatalf("expected only mapped routes, got %#v", vectors)
	}
	for _, vector := range vectors {
		if !strings.HasPrefix(vector.Route, "https://api.example/api/v1/") {
			t.Fatalf("unexpected route %s", vector.Route)
		}
	}
}

func TestCompositeSkipsSPATrainingWhenStartPathSet(t *testing.T) {
	seed := []contracts.AttackVector{
		contracts.NewAttackVector("http://shop.test/#/", "GET", "URL_PATH"),
		contracts.NewAttackVector("http://shop.test/rest/products/search?q=", "GET", "QUERY_PARAMETER"),
	}
	engine := func() *CompositeEngine {
		return &CompositeEngine{
			cfg: config.Config{
				Discovery: config.DiscoveryConfig{
					MaxPages:   50,
					RodEnabled: true,
				},
			},
			logger:  slog.New(slog.NewTextHandler(io.Discard, nil)),
			static:  &stubCrawl{},
			dynamic: &stubCrawl{vectors: seed},
		}
	}

	scoped, err := engine().Discover(context.Background(), "http://shop.test", nil, Options{StartPath: "/admin"})
	if err != nil {
		t.Fatalf("scoped: %v", err)
	}
	if len(scoped) != 2 {
		t.Fatalf("scoped crawl must keep only crawled routes, got %#v", scoped)
	}
	for _, vector := range scoped {
		if strings.Contains(vector.Route, "/ftp") || strings.Contains(vector.Route, "/redirect") || strings.Contains(vector.Route, "/rest/user/login") {
			t.Fatalf("start_path must not seed site-wide SPA routes, got %#v", scoped)
		}
	}

	full, err := engine().Discover(context.Background(), "http://shop.test", nil, Options{})
	if err != nil {
		t.Fatalf("full: %v", err)
	}
	if len(full) <= len(scoped) {
		t.Fatalf("unscoped crawl should add SPA training vectors, scoped=%d full=%d", len(scoped), len(full))
	}
}

