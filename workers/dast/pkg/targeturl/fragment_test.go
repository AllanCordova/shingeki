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

func TestSplitFragment(t *testing.T) {
	path, query, ok := targeturl.SplitFragment("/search?q=apple")
	if !ok || path != "/search" || query.Get("q") != "apple" {
		t.Fatalf("path=%q query=%v ok=%v", path, query, ok)
	}
}

func TestCanonicalSinkRouteBlanksQueryValues(t *testing.T) {
	got := targeturl.CanonicalSinkRoute("http://127.0.0.1:3010/preview?q=hoje")
	if got != "http://127.0.0.1:3010/preview?q=" {
		t.Fatalf("got %q", got)
	}
	hash := targeturl.CanonicalSinkRoute("http://shop.test/#/search?q=apple")
	if hash != "http://shop.test/#/search?q=" {
		t.Fatalf("hash got %q", hash)
	}
	if same := targeturl.CanonicalSinkRoute("http://127.0.0.1:3010/preview?q="); same != got {
		t.Fatalf("expected identical sinks, got %q vs %q", same, got)
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
