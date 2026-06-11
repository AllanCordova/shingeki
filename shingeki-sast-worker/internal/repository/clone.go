package repository

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type Cloner struct {
	timeout time.Duration
}

func NewCloner(timeout time.Duration) *Cloner {
	return &Cloner{timeout: timeout}
}

func (c *Cloner) Clone(ctx context.Context, repositoryURL string) (string, func(), error) {
	dir, err := os.MkdirTemp("", "shingeki-sast-*")
	if err != nil {
		return "", nil, fmt.Errorf("create temp dir: %w", err)
	}

	cleanup := func() {
		_ = os.RemoveAll(dir)
	}

	cloneCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	repoDir := filepath.Join(dir, "repo")
	cmd := exec.CommandContext(cloneCtx, "git", "clone", "--depth", "1", repositoryURL, repoDir)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	output, err := cmd.CombinedOutput()
	if err != nil {
		cleanup()
		return "", nil, fmt.Errorf("git clone: %w: %s", err, string(output))
	}

	return repoDir, cleanup, nil
}
