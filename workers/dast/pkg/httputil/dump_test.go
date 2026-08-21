package httputil_test

import (
	"net/http"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/shingeki/dast-worker/pkg/httputil"
)

func TestDumpRequest(t *testing.T) {
	dump := httputil.DumpRequest("POST", "https://example.com/login", map[string]string{
		"Content-Type": "application/json",
	}, `{"email":"test"}`)
	if !strings.Contains(dump, "POST https://example.com/login HTTP/1.1") {
		t.Fatalf("unexpected dump: %s", dump)
	}
	if !strings.Contains(dump, "Content-Type: application/json") {
		t.Fatalf("expected content-type header")
	}
}

func TestDumpRequestRedactsSensitiveHeaders(t *testing.T) {
	dump := httputil.DumpRequest("GET", "https://example.com/profile", map[string]string{
		"Authorization": "Bearer secret",
		"Cookie":        "session=abc",
		"X-Trace":       "ok",
	}, "")
	if strings.Contains(dump, "secret") || strings.Contains(dump, "session=abc") {
		t.Fatalf("sensitive values leaked: %s", dump)
	}
	if !strings.Contains(dump, "Authorization: [REDACTED]") || !strings.Contains(dump, "Cookie: [REDACTED]") {
		t.Fatalf("expected redacted headers, got %s", dump)
	}
	if !strings.Contains(dump, "X-Trace: ok") {
		t.Fatalf("expected non-sensitive header preserved, got %s", dump)
	}
}

func TestTruncateSplitsOnUTF8Boundary(t *testing.T) {
	got := httputil.Truncate("éé", 2)
	if !utf8.ValidString(got) {
		t.Fatalf("truncated string is not valid utf-8: %q", got)
	}
	if got != "é" && got != "" {
		t.Fatalf("unexpected truncation %q", got)
	}
}

func TestCheckSameOriginRedirectStopsCrossHost(t *testing.T) {
	origin, err := http.NewRequest(http.MethodGet, "https://a.example/start", nil)
	if err != nil {
		t.Fatal(err)
	}
	next, err := http.NewRequest(http.MethodGet, "https://b.example/leak", nil)
	if err != nil {
		t.Fatal(err)
	}
	if err := httputil.CheckSameOriginRedirect(next, []*http.Request{origin}); err != http.ErrUseLastResponse {
		t.Fatalf("expected ErrUseLastResponse, got %v", err)
	}
}
