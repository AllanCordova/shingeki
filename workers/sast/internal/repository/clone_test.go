package repository

import (
	"strings"
	"testing"
)

func TestGitCloneArgsDoNotEmbedCredentials(t *testing.T) {
	t.Parallel()

	args := gitCloneArgs("https://github.com/org/repo", "/tmp/repo", "main")
	joined := strings.Join(args, " ")
	if strings.Contains(joined, "x-access-token") || strings.Contains(joined, "ghp_") {
		t.Fatalf("clone args leaked credentials: %s", joined)
	}

	sawSeparator := false
	for i, arg := range args {
		if arg == "--" {
			sawSeparator = true
			if i+1 >= len(args) || args[i+1] != "https://github.com/org/repo" {
				t.Fatalf("expected url after --, got %v", args)
			}
		}
	}
	if !sawSeparator {
		t.Fatal("expected -- before clone url")
	}
	if !containsAll(args, []string{"-c", "protocol.file.allow=never", "--branch", "main", "--single-branch"}) {
		t.Fatalf("missing hardening args: %v", args)
	}
}

func containsAll(args, want []string) bool {
	joined := strings.Join(args, "\x00")
	for i := 0; i < len(want); i++ {
		if !strings.Contains(joined, want[i]) {
			return false
		}
	}
	return true
}
