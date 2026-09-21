package dynamic

import (
	"testing"

	"github.com/go-rod/rod/lib/proto"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestLoginURLUsesConfiguredValue(t *testing.T) {
	got := loginURL("https://app.example/shop", &contracts.TargetAuth{LoginURL: "https://app.example/signin"})
	if got != "https://app.example/signin" {
		t.Fatalf("got %s", got)
	}
}

func TestLoginURLFallsBackToLoginPath(t *testing.T) {
	got := loginURL("https://app.example/shop/", nil)
	if got != "https://app.example/shop/login" {
		t.Fatalf("got %s", got)
	}
}

func TestCookiesFromNetworkAndMerge(t *testing.T) {
	got := cookiesFromNetwork([]*proto.NetworkCookie{
		{Name: "PHPSESSID", Value: "abc", Domain: "127.0.0.1", Path: "/", HTTPOnly: true},
	})
	if len(got) != 1 || got[0].Name != "PHPSESSID" || !got[0].HTTPOnly {
		t.Fatalf("got %+v", got)
	}
	merged := mergeCapturedCookies(
		[]contracts.CapturedCookie{{Name: "PHPSESSID", Value: "old", Domain: "127.0.0.1", Path: "/"}},
		got,
	)
	if len(merged) != 1 || merged[0].Value != "abc" {
		t.Fatalf("merged=%+v", merged)
	}
}

func TestHasCredentialsDoNotCountAsSession(t *testing.T) {
	auth := &contracts.TargetAuth{Type: "credentials", Username: "a", Password: "b"}
	if hasSessionAuth(auth) {
		t.Fatal("credentials alone are not a live session")
	}
}
