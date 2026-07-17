package dynamic

import (
	"testing"

	"github.com/go-rod/rod/lib/proto"
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

func TestCookieParamsFromAuth(t *testing.T) {
	params := cookieParamsFromAuth("https://app.example/dashboard", map[string]string{
		"Cookie": "session=abc; access_token=xyz",
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
	if params[0].SameSite != proto.NetworkCookieSameSiteLax {
		t.Fatalf("expected SameSite=Lax, got %q", params[0].SameSite)
	}
	if params[1].HTTPOnly {
		t.Fatal("did not expect forced HTTPOnly")
	}
}

func TestHasCookieAuth(t *testing.T) {
	if !hasCookieAuth(map[string]string{"cookie": "a=1"}) {
		t.Fatal("expected cookie auth")
	}
	if hasCookieAuth(map[string]string{"Authorization": "Bearer x"}) {
		t.Fatal("did not expect cookie auth")
	}
}
