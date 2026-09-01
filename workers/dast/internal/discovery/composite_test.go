package discovery

import (
	"context"
	"errors"
	"io"
	"log/slog"
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
