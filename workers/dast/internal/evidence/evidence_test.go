package evidence_test

import (
	"context"
	"testing"
	"time"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
)

func TestRegexValidatorSQL(t *testing.T) {
	validator := evidence.NewRegexValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "SQL_INJECTION",
			},
			Vector: contracts.AttackVector{Route: "/login"},
		},
		PayloadUsed: "' OR 1=1 --",
		AttackBody:  "You have an error in your SQL syntax",
		RawRequest:  "POST /login",
	}

	finding := validator.Analyze(context.Background(), resp)
	if finding == nil {
		t.Fatal("expected finding")
	}
}

func TestRegexValidatorXSSRequiresPayloadReflection(t *testing.T) {
	validator := evidence.NewRegexValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "XSS",
			},
			Vector: contracts.AttackVector{Route: "/search"},
		},
		PayloadUsed: "<script>alert(1)</script>",
		AttackBody:  "<html><script src=\"/app.js\"></script></html>",
		RawRequest:  "GET /search",
	}

	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("did not expect finding for unrelated script tag: %+v", finding)
	}
}

func TestRegexValidatorXSSDetectsReflectedPayload(t *testing.T) {
	validator := evidence.NewRegexValidator()
	payload := "<script>alert(1)</script>"
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "XSS",
			},
			Vector: contracts.AttackVector{Route: "/search"},
		},
		PayloadUsed: payload,
		AttackBody:  "<html><p>" + payload + "</p></html>",
		RawRequest:  "GET /search",
	}

	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected finding when payload is reflected")
	}
}

func TestRegexValidatorXSSIgnoresHTMLEncodedPayload(t *testing.T) {
	validator := evidence.NewRegexValidator()
	payload := "<script>alert(1)</script>"
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "XSS",
			},
			Vector: contracts.AttackVector{Route: "/search"},
		},
		PayloadUsed: payload,
		AttackBody:  "<html><p>&lt;script&gt;alert(1)&lt;/script&gt;</p></html>",
		RawRequest:  "GET /search",
	}

	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("encoded reflection must not confirm XSS: %+v", finding)
	}
}

func TestTimingValidatorIgnoresSleepShorterThanTolerance(t *testing.T) {
	validator := evidence.NewTimingValidator(config.EvidenceConfig{TimingTolerance: 2 * time.Second})
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{AttackID: "atk-1", Category: "SQL_INJECTION"},
			Vector: contracts.AttackVector{Route: "/api"},
		},
		PayloadUsed: "SLEEP(1)",
		BaselineMs:  100,
		AttackMs:    400,
		RawRequest:  "POST /api",
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("sleep shorter than tolerance must not confirm: %+v", finding)
	}
}

func TestDiffValidatorSkipsPathTraversal(t *testing.T) {
	validator := evidence.NewDiffValidator(config.EvidenceConfig{BodyDiffThreshold: 100})
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "PATH_TRAVERSAL",
			},
			Vector: contracts.AttackVector{Route: "https://www.netflix.com/br-en/title/1"},
		},
		BaselineStatus: 200,
		AttackStatus:   200,
		BaselineBody:   stringsRepeat("a", 1000),
		AttackBody:     stringsRepeat("b", 5000),
		PayloadUsed:    "../storage/secret.txt",
		RawRequest:     "GET /title/1/../storage/secret.txt",
	}

	finding := validator.Analyze(context.Background(), resp)
	if finding != nil {
		t.Fatalf("expected no finding from body-length diff for path traversal, got %q", finding.Evidence)
	}
}

func TestDiffValidatorRequiresBodyLengthChange(t *testing.T) {
	validator := evidence.NewDiffValidator(config.EvidenceConfig{BodyDiffThreshold: 100})
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "GENERIC",
			},
			Vector: contracts.AttackVector{Route: "/api"},
		},
		BaselineStatus: 200,
		AttackStatus:   500,
		BaselineBody:   "same",
		AttackBody:     "same",
		PayloadUsed:    "test",
		RawRequest:     "GET /api",
	}

	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("status-only change must not confirm, got %q", finding.Evidence)
	}

	resp.AttackBody = stringsRepeat("x", 250)
	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected finding when body length exceeds threshold")
	}
}

func TestPathTraversalValidatorRequiresFileMarker(t *testing.T) {
	validator := evidence.NewPathTraversalValidator()

	spaNoise := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "PATH_TRAVERSAL",
			},
			Vector: contracts.AttackVector{Route: "https://www.netflix.com/title/1"},
		},
		BaselineBody: `<!doctype html><html><body><div>netflix</div></body></html>`,
		AttackBody:   `<!doctype html><html><body><div>different page length</div><script src="/app.js"></script></body></html>`,
		PayloadUsed:  "../storage/secret.txt",
		RawRequest:   "GET /title/1/../storage/secret.txt",
	}
	if finding := validator.Analyze(context.Background(), spaNoise); finding != nil {
		t.Fatalf("SPA noise must not confirm path traversal, got %q", finding.Evidence)
	}

	leaked := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "PATH_TRAVERSAL",
			},
			Vector: contracts.AttackVector{Route: "http://target/browse/welcome.txt"},
		},
		BaselineBody: "welcome to the lab",
		AttackBody:   "root:x:0:0:root:/root:/bin/bash\nlab-secret:SUPER-SECRET-TOKEN-12345\n",
		PayloadUsed:  "../storage/secret.txt",
		RawRequest:   "GET /browse/../storage/secret.txt",
	}
	finding := validator.Analyze(context.Background(), leaked)
	if finding == nil {
		t.Fatal("expected finding when file content markers appear")
	}
}

func TestTimingValidatorSleep(t *testing.T) {
	validator := evidence.NewTimingValidator(config.EvidenceConfig{TimingTolerance: 2 * time.Second})
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{AttackID: "atk-1", Category: "SQL_INJECTION"},
			Vector: contracts.AttackVector{Route: "/api"},
		},
		PayloadUsed: "'; SELECT SLEEP(5)--",
		BaselineMs:  100,
		AttackMs:    5200,
		RawRequest:  "POST /api",
	}

	finding := validator.Analyze(context.Background(), resp)
	if finding == nil {
		t.Fatal("expected timing finding")
	}
}

func TestRegexValidatorSQLDetectsSQLiteError(t *testing.T) {
	validator := evidence.NewRegexValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "SQL_INJECTION",
			},
			Vector: contracts.AttackVector{Route: "/login.php"},
		},
		PayloadUsed: "'",
		AttackBody:  `Database error: SQLSTATE[HY000]: General error: 1 unrecognized token: "'"`,
		RawRequest:  "POST /login.php",
	}

	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected finding for SQLite SQLSTATE error")
	}
}

func TestRegexValidatorSQLDetectsJuiceShopSQLITEErrorHTML(t *testing.T) {
	validator := evidence.NewRegexValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{AttackID: "atk-1", Category: "SQL_INJECTION"},
			Vector: contracts.AttackVector{Route: "/rest/products/search"},
		},
		PayloadUsed:    "' OR 1=1 --",
		BaselineStatus: 200,
		BaselineBody:   `{"status":"success","data":[{"id":1}]}`,
		AttackStatus:   500,
		AttackBody:     "<html><head><title>Error: SQLITE_ERROR: incomplete input</title></head></html>",
		RawRequest:     "GET /rest/products/search",
	}
	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected finding for Juice Shop SQLITE_ERROR HTML")
	}
}

func TestRegexValidatorSQLConfirms500AgainstHealthyBaseline(t *testing.T) {
	validator := evidence.NewRegexValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{AttackID: "atk-1", Category: "SQL_INJECTION"},
			Vector: contracts.AttackVector{Route: "/api"},
		},
		PayloadUsed:    "' OR 1=1 --",
		BaselineStatus: 200,
		BaselineBody:   `{"ok":true}`,
		AttackStatus:   500,
		AttackBody:     "Internal Server Error",
		RawRequest:     "GET /api",
	}
	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected finding for 500 vs 200 with SQLi payload")
	}
}

func TestSQLBooleanDetectsLargerSuccessBody(t *testing.T) {
	validator := evidence.NewSQLBooleanValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{AttackID: "atk-1", Category: "SQL_INJECTION"},
			Vector: contracts.AttackVector{Route: "/rest/products/search"},
		},
		PayloadUsed:    "')) OR 1=1--",
		BaselineStatus: 200,
		BaselineBody:   `{"status":"success","data":[{"id":1}]}`,
		AttackStatus:   200,
		AttackBody:     `{"status":"success","data":[` + stringsRepeat(`{"id":1,"name":"Apple Juice"},`, 30) + `{"id":2}]}`,
		RawRequest:     "GET /rest/products/search",
	}
	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected boolean SQLi finding")
	}
}

func TestSQLAuthBypassDetectsLoginEscape(t *testing.T) {
	validator := evidence.NewSQLAuthBypassValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "SQL_INJECTION",
			},
			Vector: contracts.AttackVector{Route: "/login.php"},
		},
		PayloadUsed:  "' OR 1=1 --",
		BaselineBody: `<form><input type="password" name="password"><p>Sign in to access dashboard, profile, notes.</p></form>`,
		AttackBody:   `<nav><a href="/logout.php">Logout</a></nav><h1>Dashboard</h1>`,
		RawRequest:   "POST /login.php",
	}

	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected login bypass finding")
	}
}

func TestSQLAuthBypassIgnoresDashboardMentionOnLoginPage(t *testing.T) {
	validator := evidence.NewSQLAuthBypassValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "SQL_INJECTION",
			},
			Vector: contracts.AttackVector{Route: "/login.php"},
		},
		PayloadUsed:  "' OR 1=1 --",
		BaselineBody: `<form><input type="password" name="password"></form>`,
		AttackBody:   `<form><input type="password" name="password"><p>Invalid credentials. Dashboard is behind login.</p></form>`,
		RawRequest:   "POST /login.php",
	}

	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("login page must not confirm bypass: %q", finding.Evidence)
	}
}

func TestSQLAuthBypassDetectsJSONToken(t *testing.T) {
	validator := evidence.NewSQLAuthBypassValidator()
	jwt := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signaturepad"
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "SQL_INJECTION",
			},
			Vector: contracts.AttackVector{Route: "/rest/user/login"},
		},
		PayloadUsed:  "' or 1=1--",
		BaselineBody: `{"error":{"message":"Invalid email or password.","status":401}}`,
		AttackBody:   `{"authentication":{"token":"` + jwt + `","bid":1,"umail":"admin@juice-sh.op"}}`,
		AttackStatus: 200,
		RawRequest:   "POST /rest/user/login",
	}

	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected JSON login bypass finding")
	}
}

func TestSQLAuthBypassIgnoresJSON401(t *testing.T) {
	validator := evidence.NewSQLAuthBypassValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{
				AttackID: "atk-1",
				Category: "SQL_INJECTION",
			},
			Vector: contracts.AttackVector{Route: "/rest/user/login"},
		},
		PayloadUsed:  "' OR 1=1 --",
		BaselineBody: `{"error":{"message":"Invalid email or password.","status":401}}`,
		AttackBody:   `{"error":{"message":"Invalid email or password.","status":401}}`,
		AttackStatus: 401,
		RawRequest:   "POST /rest/user/login",
	}

	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("401 JSON login must not confirm bypass: %q", finding.Evidence)
	}
}

func stringsRepeat(s string, n int) string {
	out := make([]byte, 0, len(s)*n)
	for i := 0; i < n; i++ {
		out = append(out, s...)
	}
	return string(out)
}
