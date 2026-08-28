package scanner

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"

	"github.com/shingeki/sast-worker/internal/config"
)

type Finding struct {
	CheckID string
	Path    string
	Line    int
	EndLine int
	Message string
	Snippet string
}

type SemgrepScanner struct {
	cfg config.ScannerConfig
}

func NewSemgrepScanner(cfg config.ScannerConfig) *SemgrepScanner {
	return &SemgrepScanner{cfg: cfg}
}

func (s *SemgrepScanner) Scan(ctx context.Context, repoDir string) ([]Finding, error) {
	scanCtx, cancel := context.WithTimeout(ctx, s.cfg.ScanTimeout)
	defer cancel()

	args := []string{
		"scan",
		"--json",
		"--quiet",
		"--metrics=off",
	}
	for _, lang := range s.languagesToScan() {
		args = append(args, "--config", langConfig(lang))
	}
	args = append(args, repoDir)

	cmd := exec.CommandContext(scanCtx, s.cfg.SemgrepBinary, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		exitErr, ok := err.(*exec.ExitError)
		if !ok || exitErr.ExitCode() != 1 {
			return nil, fmt.Errorf("semgrep scan: %w: %s", err, string(output))
		}
	}

	return ParseSemgrepOutput(output)
}

func (s *SemgrepScanner) languagesToScan() []string {
	if len(s.cfg.Languages) == 0 {
		return []string{"php", "typescript", "javascript"}
	}
	return s.cfg.Languages
}

func langConfig(language string) string {
	switch strings.ToLower(language) {
	case "php":
		return "p/php"
	case "typescript", "ts":
		return "p/typescript"
	case "javascript", "js":
		return "p/javascript"
	default:
		return "p/" + language
	}
}

type semgrepReport struct {
	Results []semgrepResult `json:"results"`
}

type semgrepResult struct {
	CheckID string `json:"check_id"`
	Path    string `json:"path"`
	Start   struct {
		Line int `json:"line"`
	} `json:"start"`
	End struct {
		Line int `json:"line"`
	} `json:"end"`
	Extra struct {
		Message string `json:"message"`
		Lines   string `json:"lines"`
	} `json:"extra"`
}

func ParseSemgrepOutput(output []byte) ([]Finding, error) {
	var report semgrepReport
	if err := json.Unmarshal(output, &report); err != nil {
		return nil, fmt.Errorf("parse semgrep json: %w", err)
	}

	findings := make([]Finding, 0, len(report.Results))
	for _, result := range report.Results {
		endLine := result.End.Line
		if endLine <= 0 {
			endLine = result.Start.Line
		}

		findings = append(findings, Finding{
			CheckID: result.CheckID,
			Path:    result.Path,
			Line:    result.Start.Line,
			EndLine: endLine,
			Message: result.Extra.Message,
			Snippet: strings.TrimSpace(result.Extra.Lines),
		})
	}

	return findings, nil
}
