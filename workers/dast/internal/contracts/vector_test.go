package contracts

import (
	"net/url"
	"testing"
)

func TestFormTargetLocation(t *testing.T) {
	if got := FormTargetLocation("GET"); got != "QUERY_PARAMETER" {
		t.Fatalf("GET form should be query parameter, got %s", got)
	}
	if got := FormTargetLocation("POST"); got != "FORM" {
		t.Fatalf("POST form should stay FORM, got %s", got)
	}
}

func TestWithQueryParams(t *testing.T) {
	got := WithQueryParams("https://lab.example/search.php", map[string]string{"q": ""})
	parsed, err := url.Parse(got)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if parsed.Path != "/search.php" {
		t.Fatalf("path: %s", parsed.Path)
	}
	if _, ok := parsed.Query()["q"]; !ok {
		t.Fatalf("expected q in query, got %s", got)
	}
}
