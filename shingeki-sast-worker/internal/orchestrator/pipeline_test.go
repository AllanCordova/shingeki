package orchestrator

import (
	"context"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/shingeki/sast-worker/internal/repository"
)

func TestResolveRepositoryRequiresRepositoryURL(t *testing.T) {
	t.Parallel()

	p := &Pipeline{labRepositoryPath: ""}

	_, _, err := p.resolveRepository(context.Background(), "")
	if err == nil {
		t.Fatal("expected error when repository_url is empty and lab path is unset")
	}
}

func TestResolveRepositoryPrefersRepositoryURLOverLabPath(t *testing.T) {
	t.Parallel()

	p := &Pipeline{
		cloner:            repository.NewCloner(time.Second, ""),
		labRepositoryPath: "/lab/vulnerable-target",
		logger:            slog.Default(),
	}

	_, _, err := p.resolveRepository(context.Background(), "https://github.com/org/nonexistent-shingeki-sast-test-repo")
	if err == nil {
		t.Fatal("expected git clone error instead of using lab path")
	}

	if !strings.Contains(err.Error(), "git clone") {
		t.Fatalf("expected clone attempt, got: %v", err)
	}
}

func TestResolveRepositoryUsesLabPathWhenRepositoryURLEmpty(t *testing.T) {
	t.Parallel()

	p := &Pipeline{
		labRepositoryPath: "/lab/vulnerable-target",
		logger:            slog.Default(),
	}

	repoDir, cleanup, err := p.resolveRepository(context.Background(), "")
	if err != nil {
		t.Fatalf("expected lab fallback, got: %v", err)
	}
	defer cleanup()

	if repoDir != "/lab/vulnerable-target" {
		t.Fatalf("expected lab path, got %q", repoDir)
	}
}
