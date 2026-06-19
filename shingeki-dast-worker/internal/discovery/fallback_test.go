package discovery

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestFallbackVectorsMapToCatalog(t *testing.T) {
	vectors := fallbackVectors("http://vulnerable-target")
	if len(vectors) < 3 {
		t.Fatalf("expected at least 3 fallback vectors, got %d", len(vectors))
	}

	attacks := []contracts.AttackItem{
		{AttackID: "1", TargetLocation: "FORM", Payload: json.RawMessage(`{"field":"email"}`)},
		{AttackID: "2", TargetLocation: "QUERY_PARAMETER", Payload: json.RawMessage(`{"parameter":"q"}`)},
		{AttackID: "3", TargetLocation: "URL_PATH", Payload: json.RawMessage(`{"value":"../storage/secret.txt"}`)},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) == 0 {
		t.Fatal("expected jobs from fallback vectors, got 0")
	}
}

func TestFallbackVectorsIncludeNextRoutes(t *testing.T) {
	vectors := fallbackVectors("http://localhost:3000")
	routes := make([]string, 0, len(vectors))
	for _, vector := range vectors {
		routes = append(routes, vector.Route)
	}

	hasLogin := false
	hasProjects := false
	for _, route := range routes {
		if strings.Contains(route, "/login") {
			hasLogin = true
		}
		if strings.Contains(route, "/projetos") {
			hasProjects = true
		}
	}

	if !hasLogin || !hasProjects {
		t.Fatalf("expected Next.js fallback routes, got %v", routes)
	}
}
