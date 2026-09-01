package discovery_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery"
)

func TestApplyDepthQuickOverridesLimits(t *testing.T) {
	base := config.DiscoveryConfig{
		MaxDepth:       3,
		MaxPages:       50,
		MaxClicks:      80,
		MaxFormSubmits: 8,
		RodEnabled:     true,
	}

	quick := discovery.ApplyDepth(base, contracts.DepthQuick)
	if quick.MaxDepth != 1 || quick.MaxPages != 12 || quick.RodEnabled {
		t.Fatalf("unexpected quick config: %+v", quick)
	}
	if quick.MaxClicks != 20 || quick.MaxFormSubmits != 3 {
		t.Fatalf("quick should reduce click/form budgets: %+v", quick)
	}

	full := discovery.ApplyDepth(base, contracts.DepthFull)
	if full.MaxDepth != base.MaxDepth || full.MaxPages != base.MaxPages || !full.RodEnabled {
		t.Fatalf("full should keep defaults: %+v", full)
	}
}

func TestApplyDepthAndScopeOverridesMaxPages(t *testing.T) {
	base := config.DiscoveryConfig{
		MaxDepth:   3,
		MaxPages:   50,
		RodEnabled: true,
	}

	scoped := discovery.ApplyDepthAndScope(base, discovery.Options{
		Depth:     contracts.DepthQuick,
		StartPath: "/products",
		MaxRoutes: 50,
	})
	if scoped.MaxPages != 50 || scoped.MaxDepth != 1 || scoped.RodEnabled {
		t.Fatalf("unexpected scoped quick config: %+v", scoped)
	}
}

func TestCapVectorsQuick(t *testing.T) {
	vectors := make([]contracts.AttackVector, 25)
	capped := discovery.CapVectors(vectors, discovery.Options{Depth: contracts.DepthQuick})
	if len(capped) != 20 {
		t.Fatalf("expected 20 vectors, got %d", len(capped))
	}

	uncapped := discovery.CapVectors(vectors, discovery.Options{Depth: contracts.DepthFull})
	if len(uncapped) != 25 {
		t.Fatalf("full should not cap, got %d", len(uncapped))
	}

	scoped := discovery.CapVectors(vectors, discovery.Options{
		Depth:     contracts.DepthQuick,
		StartPath: "/products",
		MaxRoutes: 50,
	})
	if len(scoped) != 25 {
		t.Fatalf("max_routes 50 should keep 25 vectors, got %d", len(scoped))
	}

	quickStart := discovery.CapVectors(vectors, discovery.Options{
		Depth:     contracts.DepthQuick,
		StartPath: "/products",
	})
	if len(quickStart) != 20 {
		t.Fatalf("quick with start_path should still cap, got %d", len(quickStart))
	}
}

func TestResolveSeedURL(t *testing.T) {
	seed, err := discovery.ResolveSeedURL("https://app.example.com", "/products")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if seed != "https://app.example.com/products" {
		t.Fatalf("unexpected seed: %s", seed)
	}

	seed, err = discovery.ResolveSeedURL("https://app.example.com/", `\\produtos.php`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if seed != "https://app.example.com/produtos.php" {
		t.Fatalf("expected backslash normalized, got %s", seed)
	}

	seed, err = discovery.ResolveSeedURL("https://app.example.com/", "products?tab=1#panel")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if seed != "https://app.example.com/products?tab=1" {
		t.Fatalf("expected fragment stripped, got %s", seed)
	}

	_, err = discovery.ResolveSeedURL("https://app.example.com", "https://evil.example/x")
	if err == nil {
		t.Fatal("expected off-origin start_path to fail")
	}
}
