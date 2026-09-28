package goldset

import (
	"context"
	"net/http/httptest"
	"testing"
)

func TestEvaluateInjectFindsSQLRedirectJWTPathCSRF(t *testing.T) {
	server := httptest.NewServer(InjectHandler())
	defer server.Close()

	report, err := EvaluateInject(context.Background(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if missing := report.Missing(); len(missing) > 0 {
		t.Fatalf("missing %v hits=%v unexpected=%v", missing, report.Hits, report.Unexpected)
	}
}

func TestEvaluateInjectMissesWhenPatched(t *testing.T) {
	server := httptest.NewServer(PatchedInjectHandler())
	defer server.Close()

	report, err := EvaluateInject(context.Background(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Hits) != 0 {
		t.Fatalf("patched inject fixture must be clean, hits=%v unexpected=%v", report.Hits, report.Unexpected)
	}
}

func TestClassifyInject(t *testing.T) {
	if ClassifyInject("http://app/api/login", "SQL_INJECTION") != ChallengeLoginSQLi {
		t.Fatal("login json")
	}
	if ClassifyInject("http://app/search?q=", "SQL_INJECTION") != ChallengeSearchSQLi {
		t.Fatal("search")
	}
	if ClassifyInject("http://app/login", "SQL_INJECTION") != ChallengeFormSQLi {
		t.Fatal("form")
	}
	if ClassifyInject("http://app/redirect?to=", "OPEN_REDIRECT") != ChallengeOpenRedirect {
		t.Fatal("redirect")
	}
	if ClassifyInject("http://app/api/me", "JWT_CONFUSION") != ChallengeJWTNone {
		t.Fatal("jwt")
	}
	if ClassifyInject("http://app/files/readme.txt", "PATH_TRAVERSAL") != ChallengePathFile {
		t.Fatal("path")
	}
	if ClassifyInject("http://app/api/password", "CSRF") != ChallengeCSRF {
		t.Fatal("csrf")
	}
}
