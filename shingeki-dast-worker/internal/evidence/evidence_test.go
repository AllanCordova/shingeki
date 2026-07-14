package evidence_test

import (
	"context"
	"testing"
	"time"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
)

func TestRegexValidatorSQL(t *testing.T) {
	validator := evidence.NewRegexValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "SQL_INJECTION",
			},
			Vector: contracts.AttackVector{Route: "/login"},
		},
		PayloadUsed: "' OR 1=1 --",
		AttackBody:  "You have an error in your SQL syntax",
		RawRequest:  "POST /login",
	}

	finding := validator.Analyze(context.Background(), resp)
	if finding == nil {
		t.Fatal("expected finding")
	}
}

func TestDiffValidatorSkipsPathTraversal(t *testing.T) {
	validator := evidence.NewDiffValidator(config.EvidenceConfig{BodyDiffThreshold: 100})
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "PATH_TRAVERSAL",
			},
			Vector: contracts.AttackVector{Route: "https://www.netflix.com/br-en/title/1"},
		},
		BaselineStatus: 200,
		AttackStatus:   200,
		BaselineBody:   stringsRepeat("a", 1000),
		AttackBody:     stringsRepeat("b", 5000),
		PayloadUsed:    "../storage/secret.txt",
		RawRequest:     "GET /title/1/../storage/secret.txt",
	}

	finding := validator.Analyze(context.Background(), resp)
	if finding != nil {
		t.Fatalf("expected no finding from body-length diff for path traversal, got %q", finding.Evidence)
	}
}

func TestDiffValidatorStillFlagsGenericStatusChange(t *testing.T) {
	validator := evidence.NewDiffValidator(config.EvidenceConfig{BodyDiffThreshold: 100})
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "GENERIC",
			},
			Vector: contracts.AttackVector{Route: "/api"},
		},
		BaselineStatus: 200,
		AttackStatus:   500,
		PayloadUsed:    "test",
		RawRequest:     "GET /api",
	}

	finding := validator.Analyze(context.Background(), resp)
	if finding == nil {
		t.Fatal("expected finding on status change for generic category")
	}
}

func TestPathTraversalValidatorRequiresFileMarker(t *testing.T) {
	validator := evidence.NewPathTraversalValidator()

	spaNoise := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "PATH_TRAVERSAL",
			},
			Vector: contracts.AttackVector{Route: "https://www.netflix.com/title/1"},
		},
		BaselineBody: `<!doctype html><html><body><div>netflix</div></body></html>`,
		AttackBody:   `<!doctype html><html><body><div>different page length</div><script src="/app.js"></script></body></html>`,
		PayloadUsed:  "../storage/secret.txt",
		RawRequest:   "GET /title/1/../storage/secret.txt",
	}
	if finding := validator.Analyze(context.Background(), spaNoise); finding != nil {
		t.Fatalf("SPA noise must not confirm path traversal, got %q", finding.Evidence)
	}

	leaked := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "PATH_TRAVERSAL",
			},
			Vector: contracts.AttackVector{Route: "http://target/browse/welcome.txt"},
		},
		BaselineBody: "welcome to the lab",
		AttackBody:   "root:x:0:0:root:/root:/bin/bash\nlab-secret:SUPER-SECRET-TOKEN-12345\n",
		PayloadUsed:  "../storage/secret.txt",
		RawRequest:   "GET /browse/../storage/secret.txt",
	}
	finding := validator.Analyze(context.Background(), leaked)
	if finding == nil {
		t.Fatal("expected finding when file content markers appear")
	}
}

func TestTimingValidatorSleep(t *testing.T) {
	validator := evidence.NewTimingValidator(config.EvidenceConfig{TimingTolerance: 2 * time.Second})
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{AttackID: "atk-1"},
			Vector: contracts.AttackVector{Route: "/api"},
		},
		PayloadUsed: "'; SELECT SLEEP(5)--",
		BaselineMs:  100,
		AttackMs:    5200,
		RawRequest:  "POST /api",
	}

	finding := validator.Analyze(context.Background(), resp)
	if finding == nil {
		t.Fatal("expected timing finding")
	}
}

func stringsRepeat(s string, n int) string {
	out := make([]byte, 0, len(s)*n)
	for i := 0; i < n; i++ {
		out = append(out, s...)
	}
	return string(out)
}
