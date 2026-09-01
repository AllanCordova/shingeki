package dynamic

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestOriginFromURL(t *testing.T) {
	got := originFromURL("https://app.example:8443/dashboard?x=1")
	if got != "https://app.example:8443/" {
		t.Fatalf("origin=%s", got)
	}
}

func TestExtraHeaderPairsSkipsCookie(t *testing.T) {
	pairs := extraHeaderPairs(map[string]string{
		"Cookie":        "session=abc",
		"Authorization": "Bearer tok",
	})
	foundCookie := false
	foundAuth := false
	for i := 0; i+1 < len(pairs); i += 2 {
		if pairs[i] == "Cookie" {
			foundCookie = true
		}
		if pairs[i] == "Authorization" && pairs[i+1] == "Bearer tok" {
			foundAuth = true
		}
	}
	if foundCookie {
		t.Fatalf("Cookie must be injected via CDP, not extra headers: %v", pairs)
	}
	if !foundAuth {
		t.Fatalf("missing Authorization in %v", pairs)
	}
}

func TestHasSessionAuth(t *testing.T) {
	if hasSessionAuth(nil) {
		t.Fatal("expected no session")
	}
	if !hasSessionAuth(&contracts.TargetAuth{Headers: map[string]string{"Authorization": "Bearer x"}}) {
		t.Fatal("expected bearer session")
	}
	if !hasSessionAuth(&contracts.TargetAuth{Storage: &contracts.TargetStorage{Local: map[string]string{"token": "abc"}}}) {
		t.Fatal("expected storage session")
	}
	if !hasSessionAuth(&contracts.TargetAuth{Cookies: []contracts.CapturedCookie{{Name: "sid", Value: "1"}}}) {
		t.Fatal("expected structured cookie session")
	}
}

func TestStorageOriginsRejectsOffTarget(t *testing.T) {
	auth := &contracts.TargetAuth{
		Storage: &contracts.TargetStorage{
			Origins: []contracts.OriginStorage{
				{Origin: "http://169.254.169.254/", Local: map[string]string{"k": "v"}},
				{Origin: "https://evil.example/", Local: map[string]string{"k": "v"}},
				{Origin: "https://app.example/", Local: map[string]string{"token": "ok"}},
			},
		},
	}
	got := storageOrigins("https://app.example/dashboard", "https://app.example/dashboard", auth)
	if len(got) != 1 || got[0].origin != "https://app.example/" {
		t.Fatalf("expected only target origin, got %+v", got)
	}
}
