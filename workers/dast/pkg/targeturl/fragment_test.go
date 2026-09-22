package targeturl_test

import (
	"net/url"
	"testing"

	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func TestOrigin(t *testing.T) {
	got := targeturl.Origin("http://127.0.0.1:3001/#/search?q=")
	if got != "http://127.0.0.1:3001" {
		t.Fatalf("got %q", got)
	}
}

func TestHashSearchURL(t *testing.T) {
	got := targeturl.HashSearchURL("http://host.docker.internal:3001/")
	if got != "http://host.docker.internal:3001/#/search?q=" {
		t.Fatalf("got %q", got)
	}
}

func TestSplitFragment(t *testing.T) {
	path, query, ok := targeturl.SplitFragment("/search?q=apple")
	if !ok || path != "/search" || query.Get("q") != "apple" {
		t.Fatalf("path=%q query=%v ok=%v", path, query, ok)
	}
}

func TestUsesFragmentQuery(t *testing.T) {
	parsed, err := url.Parse("http://shop.test/#/search?q=")
	if err != nil {
		t.Fatal(err)
	}
	if !targeturl.UsesFragmentQuery(parsed) {
		t.Fatal("expected hash search URL to use fragment query")
	}

	plain, err := url.Parse("http://shop.test/search.php?q=1")
	if err != nil {
		t.Fatal(err)
	}
	if targeturl.UsesFragmentQuery(plain) {
		t.Fatal("HTTP query must stay on the URL query string")
	}
}

func TestLooksLikeSearchQueryRoute(t *testing.T) {
	if !targeturl.LooksLikeSearchQueryRoute("http://shop.test/rest/products/search?q=") {
		t.Fatal("expected REST search to match")
	}
	if !targeturl.LooksLikeSearchQueryRoute("http://shop.test/#/search?q=") {
		t.Fatal("expected hash search to match")
	}
	if targeturl.LooksLikeSearchQueryRoute("http://shop.test/rest/user/login") {
		t.Fatal("login must not match search")
	}
}

func TestLooksLikeRestAPI(t *testing.T) {
	if !targeturl.LooksLikeRestAPI("http://shop.test/rest/products/search?q=") {
		t.Fatal("expected /rest/ search to match")
	}
	if targeturl.LooksLikeRestAPI("http://shop.test/login.php") {
		t.Fatal("PHP login must not look like REST")
	}
}

func TestJSONLoginURL(t *testing.T) {
	got := targeturl.JSONLoginURL("http://shop.test/#/")
	if got != "http://shop.test/rest/user/login" {
		t.Fatalf("got %q", got)
	}
}

func TestCredentialJSONLoginURL(t *testing.T) {
	shop := targeturl.CredentialJSONLoginURL("http://shop.test/#/", "http://shop.test/#/login")
	if shop != "http://shop.test/rest/user/login" {
		t.Fatalf("juice shop=%q", shop)
	}
	api := targeturl.CredentialJSONLoginURL("https://app.example/", "https://app.example/api/v1/auth/login")
	if api != "https://app.example/api/v1/auth/login" {
		t.Fatalf("api=%q", api)
	}
	php := targeturl.CredentialJSONLoginURL("http://lab.test/", "http://lab.test/login.php")
	if php != "" {
		t.Fatalf("php lab must skip json login, got %q", php)
	}
	fallback := targeturl.CredentialJSONLoginURL("http://shop.test/", "")
	if fallback != "http://shop.test/rest/user/login" {
		t.Fatalf("empty login_url=%q", fallback)
	}
}

func TestHTMLFormLoginURL(t *testing.T) {
	got := targeturl.HTMLFormLoginURL("http://lab.test/", "http://lab.test/login.php")
	if got != "http://lab.test/login.php" {
		t.Fatalf("got %q", got)
	}
	if targeturl.HTMLFormLoginURL("http://shop.test/", "http://shop.test/#/login") != "" {
		t.Fatal("hash login is not an HTML form")
	}
}

func TestAuthenticatedRESTURLs(t *testing.T) {
	if got := targeturl.RESTBasketURL("http://shop.test/#/", "6"); got != "http://shop.test/rest/basket/6" {
		t.Fatalf("basket=%q", got)
	}
	if got := targeturl.APIUsersURL("http://shop.test/"); got != "http://shop.test/api/Users/" {
		t.Fatalf("users=%q", got)
	}
	if got := targeturl.ProductReviewsURL("http://shop.test", "1"); got != "http://shop.test/rest/products/1/reviews" {
		t.Fatalf("reviews=%q", got)
	}
}
