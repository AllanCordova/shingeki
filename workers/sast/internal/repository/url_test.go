package repository

import (
	"net"
	"strings"
	"testing"
)

func TestValidateCloneURLRejectsUnsafeTargets(t *testing.T) {
	orig := lookupIPs
	t.Cleanup(func() { lookupIPs = orig })
	lookupIPs = func(host string) ([]net.IP, error) {
		if host == "rabbitmq" || host == "api" {
			return []net.IP{net.ParseIP("10.0.0.8")}, nil
		}
		return []net.IP{net.ParseIP("1.1.1.1")}, nil
	}

	hosts := []string{"github.com"}
	cases := []string{
		"http://github.com/org/repo",
		"file:///etc/passwd",
		"git://github.com/org/repo",
		"https://user:pass@github.com/org/repo",
		"https://127.0.0.1/org/repo",
		"https://10.0.0.5/org/repo",
		"https://169.254.169.254/latest/meta-data",
		"https://gitlab.com/org/repo",
		"https://rabbitmq/repo",
	}
	for _, raw := range cases {
		if _, err := validateCloneURL(raw, hosts); err == nil {
			t.Fatalf("expected rejection for %q", raw)
		}
	}
}

func TestValidateCloneURLAllowsGitHub(t *testing.T) {
	orig := lookupIPs
	t.Cleanup(func() { lookupIPs = orig })
	lookupIPs = func(string) ([]net.IP, error) {
		return []net.IP{net.ParseIP("140.82.112.3")}, nil
	}

	parsed, err := validateCloneURL("https://github.com/org/repo", []string{"github.com"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if parsed.Host != "github.com" {
		t.Fatalf("unexpected host: %s", parsed.Host)
	}
}

func TestRedactedURLStripsUserinfo(t *testing.T) {
	t.Parallel()

	got := RedactedURL("https://user:secret@github.com/org/repo")
	if strings.Contains(got, "secret") {
		t.Fatalf("expected redacted url, got %s", got)
	}
}

func TestRedactSecrets(t *testing.T) {
	t.Parallel()

	raw := "fatal: https://x-access-token:ghp_live@github.com/org/repo.git: Authentication failed"
	got := redactSecrets(raw, "ghp_live")
	if strings.Contains(got, "ghp_live") {
		t.Fatalf("token leaked: %s", got)
	}
}

func TestValidGitRef(t *testing.T) {
	t.Parallel()

	if !validGitRef("main") || !validGitRef("feature/foo-1") {
		t.Fatal("expected valid refs")
	}
	if validGitRef("-evil") || validGitRef("main;rm") || validGitRef("") {
		t.Fatal("expected invalid refs")
	}
}
