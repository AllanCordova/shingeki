package mapper_test

import (
	"strings"
	"testing"

	"github.com/shingeki/sast-worker/internal/contracts"
	"github.com/shingeki/sast-worker/internal/mapper"
	"github.com/shingeki/sast-worker/internal/scanner"
)

func TestToResultMessage(t *testing.T) {
	batch := contracts.DispatchBatch{
		DispatchID: "dispatch-1",
		SystemID:   "sys-1",
		Attacks: []contracts.AttackItem{
			{AttackID: "atk-1"},
		},
	}

	result := mapper.ToResultMessage(batch, scanner.Finding{
		CheckID: "php.lang.security.sql-injection",
		Path:    "src/app.php",
		Line:    42,
		Message: "Possible SQL injection",
		Snippet: "$query = $_GET['id'];",
	})

	if result.AttackID != "atk-1" {
		t.Fatalf("unexpected attack id: %s", result.AttackID)
	}
	if result.VulnerableRoute != "src/app.php:42" {
		t.Fatalf("unexpected route: %s", result.VulnerableRoute)
	}
	if result.PayloadUsed != "php.lang.security.sql-injection" {
		t.Fatalf("unexpected payload: %s", result.PayloadUsed)
	}
	if !strings.Contains(result.Evidence, "Possible SQL injection") {
		t.Fatalf("unexpected evidence: %s", result.Evidence)
	}
}
