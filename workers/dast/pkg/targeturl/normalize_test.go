package targeturl_test

import (
	"os"
	"testing"

	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func TestNormalizeLeavesExternalHostsUntouched(t *testing.T) {
	t.Setenv("TARGET_LOCALHOST_REWRITE", "host.docker.internal")

	got := targeturl.Normalize("http://vulnerable-target/login.php")
	if got != "http://vulnerable-target/login.php" {
		t.Fatalf("unexpected rewrite: %s", got)
	}
}

func TestNormalizeRewritesLocalhost(t *testing.T) {
	t.Setenv("TARGET_LOCALHOST_REWRITE", "host.docker.internal")

	got := targeturl.Normalize("http://localhost:3000")
	want := "http://host.docker.internal:3000"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestNormalizeNoopWithoutEnv(t *testing.T) {
	_ = os.Unsetenv("TARGET_LOCALHOST_REWRITE")

	got := targeturl.Normalize("http://localhost:3000")
	if got != "http://localhost:3000" {
		t.Fatalf("unexpected rewrite: %s", got)
	}
}

func TestAssertHTTP(t *testing.T) {
	t.Parallel()

	if err := targeturl.AssertHTTP("https://example.com/login"); err != nil {
		t.Fatalf("expected https url to be allowed: %v", err)
	}
	if err := targeturl.AssertHTTP("file:///etc/passwd"); err == nil {
		t.Fatal("expected file url to be rejected")
	}
	if err := targeturl.AssertHTTP("https://user:pass@example.com"); err == nil {
		t.Fatal("expected credentialed url to be rejected")
	}
	if err := targeturl.AssertHTTP("http://169.254.169.254/"); err == nil {
		t.Fatal("expected metadata url to be rejected")
	}
}

func TestNormalizeRewritesIPv6Loopback(t *testing.T) {
	t.Setenv("TARGET_LOCALHOST_REWRITE", "host.docker.internal")

	got := targeturl.Normalize("http://[::1]:3000")
	want := "http://host.docker.internal:3000"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}
