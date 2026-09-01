package scanner

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"unicode"

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

func (s *SemgrepScanner) Scan(ctx context.Context, repoDir string, languages []string) ([]Finding, error) {
	scanCtx, cancel := context.WithTimeout(ctx, s.cfg.ScanTimeout)
	defer cancel()

	args := []string{
		"scan",
		"--json",
		"--quiet",
		"--metrics=off",
	}
	for _, lang := range s.languagesToScan(languages) {
		cfg, ok := langConfig(lang)
		if !ok {
			continue
		}
		args = append(args, "--config", cfg)
	}
	if !hasLangConfig(args) {
		return nil, fmt.Errorf("semgrep scan: no valid languages")
	}
	args = append(args, repoDir)

	cmd := exec.CommandContext(scanCtx, s.cfg.SemgrepBinary, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	if err != nil {
		exitErr, ok := err.(*exec.ExitError)
		if !ok || exitErr.ExitCode() != 1 {
			return nil, fmt.Errorf("semgrep scan: %w: %s", err, strings.TrimSpace(stderr.String()))
		}
	}

	return ParseSemgrepOutput(stdout.Bytes())
}

func (s *SemgrepScanner) languagesToScan(override []string) []string {
	if len(override) > 0 {
		return override
	}
	if len(s.cfg.Languages) == 0 {
		return []string{"php", "typescript", "javascript"}
	}
	return s.cfg.Languages
}

func hasLangConfig(args []string) bool {
	for i, arg := range args {
		if arg == "--config" && i+1 < len(args) {
			return true
		}
	}
	return false
}

func langConfig(language string) (string, bool) {
	language = strings.ToLower(strings.TrimSpace(language))
	switch language {
	case "ts":
		language = "typescript"
	case "js":
		language = "javascript"
	}
	if !validLanguage(language) {
		return "", false
	}
	return "p/" + language, true
}

func validLanguage(language string) bool {
	if language == "" {
		return false
	}
	for _, r := range language {
		if !unicode.IsLetter(r) && !unicode.IsDigit(r) {
			return false
		}
	}
	return true
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
	output = bytes.TrimSpace(output)
	if start := bytes.IndexByte(output, '{'); start >= 0 {
		if end := bytes.LastIndexByte(output, '}'); end >= start {
			output = output[start : end+1]
		}
	}

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
