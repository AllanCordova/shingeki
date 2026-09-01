package discovery

import (
	"strings"
	"testing"
)

func TestFallbackVectorsUsesSeedOnly(t *testing.T) {
	vectors := fallbackVectors("http://vulnerable-target/app")
	if len(vectors) != 1 {
		t.Fatalf("expected 1 fallback vector, got %d", len(vectors))
	}
	if vectors[0].Route != "http://vulnerable-target/app" {
		t.Fatalf("unexpected route %s", vectors[0].Route)
	}
	if vectors[0].TargetLocation != "URL_PATH" {
		t.Fatalf("expected URL_PATH, got %s", vectors[0].TargetLocation)
	}

	for _, vector := range vectors {
		if strings.Contains(vector.Route, "login.php") || strings.Contains(vector.Route, "notes.php") {
			t.Fatalf("fallback must not invent lab routes, got %s", vector.Route)
		}
	}
}

func TestFallbackVectorsEmpty(t *testing.T) {
	if got := fallbackVectors("  "); got != nil {
		t.Fatalf("expected nil, got %+v", got)
	}
}
