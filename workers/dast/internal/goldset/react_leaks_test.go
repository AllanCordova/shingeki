package goldset

import (
	"context"
	"net/http/httptest"
	"testing"
)

func TestEvaluateReactLeaksFindsJsonJsAndXss(t *testing.T) {
	server := httptest.NewServer(ReactLeakHandler())
	defer server.Close()

	report, err := EvaluateReactLeaks(context.Background(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	missing := report.Missing()
	if len(missing) > 0 {
		t.Fatalf("missing %v hits=%v unexpected=%v", missing, report.Hits, report.Unexpected)
	}
	if len(report.Hits) != 3 {
		t.Fatalf("hits=%d %+v", len(report.Hits), report.Hits)
	}
}

func TestClassifyReactLeak(t *testing.T) {
	if ClassifyReactLeak("http://app/api/config", "stripe_sk_live") != ChallengeStripeLeak {
		t.Fatal("stripe")
	}
	if ClassifyReactLeak("http://app/_next/static/chunks/app.js", "github_pat") != ChallengeGitHubLeak {
		t.Fatal("github")
	}
	if ClassifyReactLeak("http://app/preview?q=", "XSS") != ChallengeReactXSS {
		t.Fatal("xss")
	}
	if ClassifyReactLeak("http://app/login", "SQL_INJECTION") != "" {
		t.Fatal("unknown")
	}
}
