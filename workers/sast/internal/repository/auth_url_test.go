package repository

import "testing"

func TestWithGitHubToken(t *testing.T) {
	got := withGitHubToken("https://github.com/org/repo", "ghp_test")
	want := "https://x-access-token:ghp_test@github.com/org/repo"

	if got != want {
		t.Fatalf("unexpected url: %s", got)
	}
}

func TestWithGitHubTokenSkipsWhenEmpty(t *testing.T) {
	raw := "https://github.com/org/repo"
	if got := withGitHubToken(raw, ""); got != raw {
		t.Fatalf("expected unchanged url, got %s", got)
	}
}

func TestWithGitHubTokenSkipsNonGitHub(t *testing.T) {
	raw := "https://gitlab.com/org/repo"
	if got := withGitHubToken(raw, "token"); got != raw {
		t.Fatalf("expected unchanged url, got %s", got)
	}
}
