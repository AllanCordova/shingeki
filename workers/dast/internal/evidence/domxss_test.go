package evidence

import (
	"context"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestShouldProbeDOMXSSHashSearch(t *testing.T) {
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "XSS"},
			Vector: contracts.AttackVector{Route: "http://shop.test/#/search?q="},
		},
		AttackBody: `{"status":"success"}`,
	}
	if !shouldProbeDOMXSS(resp) {
		t.Fatal("hash-routed search must be probed even when HTTP body is JSON")
	}
}

func TestShouldProbeDOMXSSSkipsJSONAPI(t *testing.T) {
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "XSS"},
			Vector: contracts.AttackVector{Route: "http://shop.test/rest/products/search?q="},
		},
		AttackBody: `{"status":"success","data":[]}`,
	}
	if shouldProbeDOMXSS(resp) {
		t.Fatal("REST JSON search must not open Chromium")
	}
}

func TestShouldProbeDOMXSSHTMLDocument(t *testing.T) {
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "XSS"},
			Vector: contracts.AttackVector{Route: "http://lab.test/search.php?q="},
		},
		AttackBody: `<!doctype html><html><body>results</body></html>`,
	}
	if !shouldProbeDOMXSS(resp) {
		t.Fatal("HTML search pages can be probed for DOM sinks")
	}
}

func TestDOMXSSValidatorSkipsWhenRodDisabled(t *testing.T) {
	validator := NewDOMXSSValidator(config.DiscoveryConfig{RodEnabled: false}, nil)
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "XSS"},
			Vector: contracts.AttackVector{Route: "http://shop.test/#/search?q="},
		},
		PayloadUsed: `<iframe src="javascript:alert(` + "`xss`" + `)">`,
		AttackBody:  `<!doctype html><app-root></app-root>`,
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("quick/no-rod scans must not confirm DOM XSS, got %q", finding.Evidence)
	}
}
