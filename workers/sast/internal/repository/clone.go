package repository

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const askPassScript = `#!/bin/sh
case "$1" in
*[Uu]sername*) printf '%s\n' "x-access-token" ;;
*) printf '%s\n' "$GIT_ASKPASS_PASSWORD" ;;
esac
`

type Cloner struct {
	timeout      time.Duration
	githubToken  string
	allowedHosts []string
}

func NewCloner(timeout time.Duration, githubToken string, allowedHosts ...string) *Cloner {
	hosts := make([]string, 0, len(allowedHosts))
	for _, host := range allowedHosts {
		host = strings.TrimSpace(host)
		if host != "" {
			hosts = append(hosts, host)
		}
	}
	if len(hosts) == 0 {
		hosts = []string{"github.com"}
	}
	return &Cloner{timeout: timeout, githubToken: strings.TrimSpace(githubToken), allowedHosts: hosts}
}

func (c *Cloner) Clone(ctx context.Context, repositoryURL, ref string) (string, func(), error) {
	parsed, err := validateCloneURL(repositoryURL, c.allowedHosts)
	if err != nil {
		return "", nil, err
	}
	ref = strings.TrimSpace(ref)
	if ref != "" && !validGitRef(ref) {
		return "", nil, fmt.Errorf("invalid repository ref")
	}

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
	cloneURL := parsed.String()
	cmd := exec.CommandContext(cloneCtx, "git", gitCloneArgs(cloneURL, repoDir, ref)...)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0", "GCM_INTERACTIVE=never")

	if c.githubToken != "" && isGitHubHost(parsed.Hostname()) {
		askPass, err := writeAskPass(dir)
		if err != nil {
			cleanup()
			return "", nil, err
		}
		cmd.Env = append(cmd.Env, "GIT_ASKPASS="+askPass, "GIT_ASKPASS_PASSWORD="+c.githubToken)
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		cleanup()
		output := redactSecrets(strings.TrimSpace(stderr.String()+"\n"+stdout.String()), c.githubToken)
		return "", nil, fmt.Errorf("git clone: %w: %s", err, output)
	}

	return repoDir, cleanup, nil
}

func gitCloneArgs(cloneURL, repoDir, ref string) []string {
	args := []string{"-c", "protocol.file.allow=never", "clone", "--depth", "1"}
	if ref != "" {
		args = append(args, "--branch", ref, "--single-branch")
	}
	return append(args, "--", cloneURL, repoDir)
}

func writeAskPass(dir string) (string, error) {
	path := filepath.Join(dir, "askpass.sh")
	if err := os.WriteFile(path, []byte(askPassScript), 0o700); err != nil {
		return "", fmt.Errorf("write git askpass: %w", err)
	}
	return path, nil
}
