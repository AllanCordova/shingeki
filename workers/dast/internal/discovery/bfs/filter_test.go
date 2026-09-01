package bfs_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/discovery/bfs"
)

func TestIsBlockedDiscoveryURL(t *testing.T) {
	cases := []struct {
		url     string
		blocked bool
	}{
		{"https://www.bling.com.br/produtos.php", false},
		{"https://www.bling.com.br/login", false},
		{"https://www.bling.com.br/locales/front/pt-BR/main.json", true},
		{"https://www.bling.com.br/cdn-cgi/images/cf-icon-ok.png", true},
		{"https://www.bling.com.br/favicon.ico", true},
		{"https://www.bling.com.br/assets/app.js", true},
		{"https://static.cloudflareinsights.com/beacon.min.js", true},
		{"https://www.google-analytics.com/g/collect", true},
		{"https://www.bling.com.br/wp-content/uploads/2024/06/4.jpg", true},
		{"http://127.0.0.1:3001/socket.io/?EIO=4&transport=polling", true},
		{"http://127.0.0.1:3001/login.php/socket.io/?EIO=4", true},
		{"http://127.0.0.1:3001/assets/i18n/en.json", true},
		{"http://127.0.0.1:3001/rest/products/search?q=", false},
	}

	for _, tc := range cases {
		got := bfs.IsBlockedDiscoveryURL(tc.url)
		if got != tc.blocked {
			t.Fatalf("%s: blocked=%v want %v", tc.url, got, tc.blocked)
		}
	}
}

func TestIsAttackableDiscoveryURLRequiresSameOrigin(t *testing.T) {
	target := "https://www.bling.com.br/"
	if !bfs.IsAttackableDiscoveryURL(target, "https://www.bling.com.br/produtos.php") {
		t.Fatal("expected produtos.php attackable")
	}
	if !bfs.IsAttackableDiscoveryURL(target, "https://api.bling.com.br/Api/v3/produtos") {
		t.Fatal("expected api subdomain attackable")
	}
	if bfs.IsAttackableDiscoveryURL(target, "https://static.cloudflareinsights.com/x") {
		t.Fatal("expected off-origin blocked")
	}
}
