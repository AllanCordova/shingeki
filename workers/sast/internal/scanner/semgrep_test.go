package scanner_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/shingeki/sast-worker/internal/scanner"
)

func TestParseSemgrepOutput(t *testing.T) {
	raw := []byte(`{
		"results": [{
			"check_id": "php.lang.security.sql-injection",
			"path": "app/Models/User.php",
			"start": {"line": 10},
			"extra": {
				"message": "User input in SQL query",
				"lines": "$sql = \"SELECT * FROM users WHERE id = \" . $_GET['id'];"
			}
		}]
	}`)

	findings, err := scanner.ParseSemgrepOutput(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(findings) != 1 {
		t.Fatalf("expected 1 finding, got %d", len(findings))
	}
	if findings[0].CheckID != "php.lang.security.sql-injection" {
		t.Fatalf("unexpected check id: %s", findings[0].CheckID)
	}
	if findings[0].Line != 10 {
		t.Fatalf("unexpected line: %d", findings[0].Line)
	}
}

func TestLangConfigAllowlist(t *testing.T) {
	got, ok := scanner.LanguagePack("go")
	if !ok || got != "p/golang" {
		t.Fatalf("go=%q ok=%v", got, ok)
	}
	got, ok = scanner.LanguagePack("python")
	if !ok || got != "p/python" {
		t.Fatalf("python=%q ok=%v", got, ok)
	}
	if _, ok := scanner.LanguagePack("cobol"); ok {
		t.Fatal("unknown languages must not reach semgrep --config")
	}
}

func TestParseSemgrepOutputIgnoresLeadingNoise(t *testing.T) {
	raw := []byte(`Some warning
{"results": []}`)

	findings, err := scanner.ParseSemgrepOutput(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(findings) != 0 {
		t.Fatalf("expected 0 findings, got %d", len(findings))
	}
}

func TestDetectRepoLanguages(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "app"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "node_modules"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "app", "page.tsx"), []byte("export default function Page() { return null }"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "node_modules", "index.js"), []byte("module.exports = 1"), 0o644); err != nil {
		t.Fatal(err)
	}

	got := scanner.DetectRepoLanguages(dir)
	if len(got) != 1 || got[0] != "typescript" {
		t.Fatalf("detected=%v", got)
	}
}

func TestHydrateSnippetsReplacesRequiresLogin(t *testing.T) {
	dir := t.TempDir()
	workflow := filepath.Join(dir, "test.yml")
	content := "name: ci\nsteps:\n  - uses: actions/checkout@v4\n"
	if err := os.WriteFile(workflow, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	findings := []scanner.Finding{{
		Path:    workflow,
		Line:    3,
		EndLine: 3,
		Snippet: "requires login",
	}}
	scanner.HydrateSnippets(dir, findings)
	if findings[0].Snippet != "- uses: actions/checkout@v4" {
		t.Fatalf("snippet=%q", findings[0].Snippet)
	}
}
