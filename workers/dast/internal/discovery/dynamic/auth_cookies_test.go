package dynamic

import (
	"net/url"
	"testing"

	"github.com/go-rod/rod/lib/proto"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestSplitCookieHeader(t *testing.T) {
	pairs := splitCookieHeader(" a=1 ; b=two;invalid; =x; c=3=4 ")
	if len(pairs) != 3 {
		t.Fatalf("expected 3 pairs, got %#v", pairs)
	}
	if pairs[0] != (cookiePair{name: "a", value: "1"}) {
		t.Fatalf("pair0: %#v", pairs[0])
	}
	if pairs[1] != (cookiePair{name: "b", value: "two"}) {
		t.Fatalf("pair1: %#v", pairs[1])
	}
	if pairs[2] != (cookiePair{name: "c", value: "3=4"}) {
		t.Fatalf("pair2: %#v", pairs[2])
	}
}

func TestCookieParamsFromHeaderDoesNotForceSameSite(t *testing.T) {
	params := cookieParamsFromAuth("https://app.example/dashboard", &contracts.TargetAuth{
		Headers: map[string]string{
			"Cookie": "session=abc; access_token=xyz",
		},
	})
	if len(params) != 2 {
		t.Fatalf("expected 2 cookies, got %d", len(params))
	}
	if params[0].Name != "session" || params[0].Value != "abc" {
		t.Fatalf("unexpected first cookie %#v", params[0])
	}
	if params[0].Domain != "" {
		t.Fatalf("expected empty Domain (URL-scoped), got %q", params[0].Domain)
	}
	if params[0].URL != "https://app.example/" {
		t.Fatalf("unexpected url %q", params[0].URL)
	}
	if params[0].SameSite != "" {
		t.Fatalf("did not expect forced SameSite, got %q", params[0].SameSite)
	}
	if params[1].HTTPOnly {
		t.Fatal("did not expect forced HTTPOnly")
	}
}

func TestCookieParamsFromCapturedKeepsAttributes(t *testing.T) {
	params := cookieParamsFromAuth("https://www.example.com/app", &contracts.TargetAuth{
		Cookies: []contracts.CapturedCookie{
			{
				Name:     "PHPSESSID",
				Value:    "abc",
				Domain:   ".example.com",
				Path:     "/",
				Secure:   true,
				HTTPOnly: true,
				SameSite: "lax",
				HostOnly: false,
			},
			{
				Name:     "host_only",
				Value:    "1",
				Domain:   "www.example.com",
				HostOnly: true,
				Secure:   true,
				PartitionKey: &contracts.CookiePartitionKey{
					TopLevelSite: "https://www.example.com",
				},
			},
		},
	})
	if len(params) != 2 {
		t.Fatalf("expected 2 cookies, got %d", len(params))
	}
	if params[0].Domain != ".example.com" {
		t.Fatalf("expected captured domain, got %q", params[0].Domain)
	}
	if params[0].SameSite != proto.NetworkCookieSameSiteLax {
		t.Fatalf("expected SameSite=Lax, got %q", params[0].SameSite)
	}
	if !params[0].HTTPOnly || !params[0].Secure {
		t.Fatal("expected httpOnly and secure")
	}
	if params[1].Domain != "" {
		t.Fatalf("host-only cookie must omit Domain, got %q", params[1].Domain)
	}
	if params[1].PartitionKey == nil || params[1].PartitionKey.TopLevelSite != "https://www.example.com" {
		t.Fatalf("expected partition key, got %#v", params[1].PartitionKey)
	}
}

func TestHasCookieAuth(t *testing.T) {
	if !hasCookieAuth(&contracts.TargetAuth{Headers: map[string]string{"cookie": "a=1"}}) {
		t.Fatal("expected cookie auth")
	}
	if !hasCookieAuth(&contracts.TargetAuth{Cookies: []contracts.CapturedCookie{{Name: "sid", Value: "1"}}}) {
		t.Fatal("expected structured cookie auth")
	}
	if hasCookieAuth(&contracts.TargetAuth{Headers: map[string]string{"Authorization": "Bearer x"}}) {
		t.Fatal("did not expect cookie auth")
	}
}

func TestRewriteDebuggerHost(t *testing.T) {
	base, err := url.Parse("http://host.docker.internal:9222")
	if err != nil {
		t.Fatal(err)
	}
	got := rewriteDebuggerHost("ws://127.0.0.1:9222/devtools/browser/abc", base)
	if got != "ws://host.docker.internal:9222/devtools/browser/abc" {
		t.Fatalf("got %s", got)
	}
}
