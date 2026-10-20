package dynamic

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestRegisterPageURLUsesConfiguredValue(t *testing.T) {
	got := registerPageURL("https://app.example/shop", &contracts.TargetAuth{RegisterURL: "https://app.example/signup"})
	if got != "https://app.example/signup" {
		t.Fatalf("got %s", got)
	}
}

func TestRegisterPageURLFallsBackToRegisterPath(t *testing.T) {
	got := registerPageURL("https://app.example/shop/", nil)
	if got != "https://app.example/shop/register" {
		t.Fatalf("got %s", got)
	}
}

func TestRegisterIdentitySplitsEmail(t *testing.T) {
	email, user := registerIdentity("scanabcd@example.com")
	if email != "scanabcd@example.com" || user != "scanabcd" {
		t.Fatalf("email=%s user=%s", email, user)
	}
}
