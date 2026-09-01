package scanner_test

import (
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
