package httputil_test

import (
	"strings"
	"testing"

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
