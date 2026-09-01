package discovery

import (
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestAppendRecordedRoutesAddsXHR(t *testing.T) {
	existing := []contracts.AttackVector{
		contracts.NewAttackVector("https://www.example.com/produtos.php", "GET", "URL_PATH"),
	}
	auth := &contracts.TargetAuth{
		Routes: []contracts.CapturedRoute{
			{Method: "GET", URL: "https://www.example.com/produtos.php", Type: "main_frame"},
			{Method: "POST", URL: "https://www.example.com/utils/requestMethods.php", Type: "xmlhttprequest"},
			{Method: "GET", URL: "https://static.cloudflareinsights.com/x", Type: "script"},
		},
	}

	got := AppendRecordedRoutes("https://www.example.com/produtos.php", existing, auth)
	if len(got) != 2 {
		t.Fatalf("expected seed + xhr, got %#v", got)
	}
	if got[1].Method != "POST" || got[1].TargetLocation != "API_ENDPOINT" {
		t.Fatalf("unexpected recorded vector %#v", got[1])
	}
}

func TestAppendRecordedRoutesKeepsAPISubdomain(t *testing.T) {
	auth := &contracts.TargetAuth{
		Routes: []contracts.CapturedRoute{
			{Method: "GET", URL: "https://api.example.com/v3/items", Type: "xmlhttprequest"},
		},
	}
	got := AppendRecordedRoutes("https://www.example.com/", nil, auth)
	if len(got) != 1 {
		t.Fatalf("expected api subdomain route, got %#v", got)
	}
}

func TestAppendRecordedRoutesRewritesLocalhostAndSeedsLoginFields(t *testing.T) {
	t.Setenv("TARGET_LOCALHOST_REWRITE", "host.docker.internal")
	auth := &contracts.TargetAuth{
		Routes: []contracts.CapturedRoute{
			{Method: "POST", URL: "http://127.0.0.1:3001/rest/user/login", Type: "xmlhttprequest"},
		},
	}

	got := AppendRecordedRoutes("http://host.docker.internal:3001/", nil, auth)
	if len(got) != 1 {
		t.Fatalf("expected rewritten login vector, got %#v", got)
	}
	if !strings.Contains(got[0].Route, "host.docker.internal:3001/rest/user/login") {
		t.Fatalf("route not rewritten: %s", got[0].Route)
	}
	if _, ok := got[0].Params["email"]; !ok {
		t.Fatalf("expected email param for login JSON inject, got %#v", got[0].Params)
	}
	if _, ok := got[0].Params["password"]; !ok {
		t.Fatalf("expected password param for login JSON inject, got %#v", got[0].Params)
	}
}
