package scanner

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"

	"github.com/shingeki/sast-worker/internal/config"
)

var securityPacks = []string{
	"p/default",
	"p/owasp-top-ten",
}

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

	configs := s.scanConfigs(repoDir, languages)
	if len(configs) == 0 {
		return nil, fmt.Errorf("semgrep scan: no valid rule packs")
	}

	args := []string{
		"scan",
		"--json",
		"--quiet",
		"--metrics=off",
	}
	for _, cfg := range configs {
		args = append(args, "--config", cfg)
	}
	args = append(args, repoDir)

	cmd := exec.CommandContext(scanCtx, s.cfg.SemgrepBinary, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()

	findings, report, parseErr := parseSemgrepReport(stdout.Bytes())
	if fatal := fatalConfigErrors(report); len(fatal) > 0 {
		return nil, fmt.Errorf("semgrep scan: %s", strings.Join(fatal, "; "))
	}
	if err != nil {
		exitErr, ok := err.(*exec.ExitError)
		if !ok || exitErr.ExitCode() != 1 {
			detail := strings.TrimSpace(stderr.String())
			if parseErr != nil && detail == "" {
				detail = parseErr.Error()
			}
			if detail == "" {
				detail = err.Error()
			}
			return nil, fmt.Errorf("semgrep scan: %s", detail)
		}
	}
	if parseErr != nil {
		return nil, parseErr
	}
	return findings, nil
}

func (s *SemgrepScanner) scanConfigs(repoDir string, languages []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, 8)
	add := func(cfg string) {
		cfg = strings.TrimSpace(cfg)
		if cfg == "" {
			return
		}
		if _, ok := seen[cfg]; ok {
			return
		}
		seen[cfg] = struct{}{}
		out = append(out, cfg)
	}
	for _, pack := range securityPacks {
		add(pack)
	}
	for _, lang := range filterLanguagesByRepo(repoDir, s.languagesToScan(languages)) {
		if cfg, ok := langConfig(lang); ok {
			add(cfg)
		}
	}
	return out
}

func (s *SemgrepScanner) languagesToScan(override []string) []string {
	if len(override) > 0 {
		return override
	}
	if len(s.cfg.Languages) == 0 {
		return []string{"php", "typescript", "javascript", "python", "go", "java", "ruby"}
	}
	return s.cfg.Languages
}

func langConfig(language string) (string, bool) {
	language = strings.ToLower(strings.TrimSpace(language))
	switch language {
	case "ts":
		language = "typescript"
	case "js":
		language = "javascript"
	case "py":
		language = "python"
	case "go", "golang":
		return "p/golang", true
	case "rb":
		language = "ruby"
	}
	switch language {
	case "php", "javascript", "typescript", "python", "java", "ruby":
		return "p/" + language, true
	default:
		return "", false
	}
}

func LanguagePack(language string) (string, bool) {
	return langConfig(language)
}

type semgrepReport struct {
	Results []semgrepResult `json:"results"`
	Errors  []semgrepError  `json:"errors"`
}

type semgrepError struct {
	Code    int    `json:"code"`
	Level   string `json:"level"`
	Message string `json:"message"`
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
	findings, _, err := parseSemgrepReport(output)
	return findings, err
}

func parseSemgrepReport(output []byte) ([]Finding, semgrepReport, error) {
	output = bytes.TrimSpace(output)
	if start := bytes.IndexByte(output, '{'); start >= 0 {
		if end := bytes.LastIndexByte(output, '}'); end >= start {
			output = output[start : end+1]
		}
	}

	var report semgrepReport
	if err := json.Unmarshal(output, &report); err != nil {
		return nil, report, fmt.Errorf("parse semgrep json: %w", err)
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

	return findings, report, nil
}

func fatalConfigErrors(report semgrepReport) []string {
	var out []string
	for _, item := range report.Errors {
		if strings.EqualFold(item.Level, "warn") {
			continue
		}
		msg := strings.TrimSpace(item.Message)
		if msg == "" {
			continue
		}
		if item.Code == 2 || item.Code == 7 ||
			strings.Contains(msg, "Failed to download") ||
			strings.Contains(msg, "invalid configuration") {
			out = append(out, msg)
		}
	}
	return out
}
