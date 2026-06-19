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
