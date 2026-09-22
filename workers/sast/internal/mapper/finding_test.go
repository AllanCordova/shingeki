package mapper_test

import (
	"encoding/json"
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
		Path:    "/tmp/shingeki-sast-1/repo/src/app.php",
		Line:    42,
		Message: "Possible SQL injection",
		Snippet: "$query = $_GET['id'];",
	}, "/tmp/shingeki-sast-1/repo")

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

func TestAttackIDForFindingMatchesCategoryAndLanguage(t *testing.T) {
	batch := contracts.DispatchBatch{
		Attacks: []contracts.AttackItem{
			{
				AttackID: "xss-1",
				Category: "XSS",
				Payload:  json.RawMessage(`{"languages":["javascript"]}`),
			},
			{
				AttackID: "sqli-1",
				Category: "SQL_INJECTION",
				Payload:  json.RawMessage(`{"languages":["php"]}`),
			},
		},
	}

	got := mapper.AttackIDForFinding(batch, scanner.Finding{
		CheckID: "php.lang.security.sql-injection",
		Path:    "app/Models/User.php",
	})
	if got != "sqli-1" {
		t.Fatalf("expected sqli-1, got %s", got)
	}
}

func TestAttackIDForFindingSkipsUnselectedCategory(t *testing.T) {
	batch := contracts.DispatchBatch{
		Attacks: []contracts.AttackItem{
			{
				AttackID: "xss-1",
				Category: "XSS",
				Payload:  json.RawMessage(`{"languages":["php"]}`),
			},
			{
				AttackID: "path-1",
				Category: "PATH_TRAVERSAL",
				Payload:  json.RawMessage(`{"languages":["php"]}`),
			},
		},
	}

	got := mapper.AttackIDForFinding(batch, scanner.Finding{
		CheckID: "php.lang.security.injection.tainted-sql-string.tainted-sql-string",
		Path:    "login.php",
	})
	if got != "" {
		t.Fatalf("sql finding must not map onto xss/path catalog items, got %s", got)
	}
}

func TestAttackIDForFindingKeepsUncategorizedRule(t *testing.T) {
	batch := contracts.DispatchBatch{
		Attacks: []contracts.AttackItem{
			{
				AttackID: "xss-1",
				Category: "XSS",
				Payload:  json.RawMessage(`{"languages":["javascript"]}`),
			},
			{
				AttackID: "sqli-1",
				Category: "SQL_INJECTION",
				Payload:  json.RawMessage(`{"languages":["php"]}`),
			},
		},
	}

	got := mapper.AttackIDForFinding(batch, scanner.Finding{
		CheckID: "yaml.github-actions.security.github-actions-mutable-action-tag.github-actions-mutable-action-tag",
		Path:    ".github/workflows/test.yml",
	})
	if got != "xss-1" {
		t.Fatalf("uncategorized finding must still be published, got %s", got)
	}
}

func TestCategoryForCheckID(t *testing.T) {
	if got := mapper.CategoryForCheckID("php.lang.security.injection.echoed-request.echoed-request"); got != mapper.CategoryXSS {
		t.Fatalf("xss=%s", got)
	}
	if got := mapper.CategoryForCheckID("javascript.express.security.audit.express-open-redirect"); got != mapper.CategoryOpenRedirect {
		t.Fatalf("redirect=%s", got)
	}
	if got := mapper.CategoryForCheckID("python.lang.security.audit.sqli.psycopg-sqli"); got != mapper.CategorySQLInjection {
		t.Fatalf("sqli=%s", got)
	}
}
