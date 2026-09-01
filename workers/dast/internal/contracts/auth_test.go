package contracts_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestDispatchBatchAuthHeaders(t *testing.T) {
	batch := contracts.DispatchBatch{
		Auth: &contracts.TargetAuth{
			Type: "cookie",
			Headers: map[string]string{
				"Cookie": "session=abc",
			},
		},
	}

	headers := batch.AuthHeaders()
	if headers["Cookie"] != "session=abc" {
		t.Fatalf("unexpected headers: %+v", headers)
	}
}

func TestEffectiveAuthHeadersSynthesizesBearerFromStorage(t *testing.T) {
	headers := contracts.EffectiveAuthHeaders(&contracts.TargetAuth{
		Type: "cookie",
		Headers: map[string]string{
			"Cookie": "session=abc",
		},
		Storage: &contracts.TargetStorage{
			Local: map[string]string{
				"access_token": "header.payload.signature",
			},
		},
	})
	if headers["Cookie"] != "session=abc" {
		t.Fatalf("cookie=%s", headers["Cookie"])
	}
	if headers["Authorization"] != "Bearer header.payload.signature" {
		t.Fatalf("authorization=%s", headers["Authorization"])
	}
}

func TestEffectiveAuthHeadersKeepsExistingBearer(t *testing.T) {
	headers := contracts.EffectiveAuthHeaders(&contracts.TargetAuth{
		Headers: map[string]string{"Authorization": "Bearer existing"},
		Storage: &contracts.TargetStorage{Local: map[string]string{"token": "from-storage-token-value"}},
	})
	if headers["Authorization"] != "Bearer existing" {
		t.Fatalf("expected existing bearer, got %s", headers["Authorization"])
	}
}

func TestCookieAppliesToURLHonorsHostOnly(t *testing.T) {
	hostOnly := contracts.CapturedCookie{Name: "sid", Value: "1", Domain: "www.example.com", HostOnly: true, Path: "/"}
	domain := contracts.CapturedCookie{Name: "sid", Value: "1", Domain: ".example.com", Path: "/"}
	if contracts.CookieAppliesToURL(hostOnly, "https://api.example.com/v1") {
		t.Fatal("host-only www cookie must not apply to api")
	}
	if !contracts.CookieAppliesToURL(hostOnly, "https://www.example.com/app") {
		t.Fatal("host-only www cookie must apply to www")
	}
	if !contracts.CookieAppliesToURL(domain, "https://api.example.com/v1") {
		t.Fatal("domain cookie must apply to api subdomain")
	}
}

func TestEffectiveAuthHeadersBuildsCookieFromStructuredCookies(t *testing.T) {
	headers := contracts.EffectiveAuthHeaders(&contracts.TargetAuth{
		Cookies: []contracts.CapturedCookie{
			{Name: "PHPSESSID", Value: "abc"},
			{Name: "sid", Value: "2"},
		},
	})
	if headers["Cookie"] != "PHPSESSID=abc; sid=2" {
		t.Fatalf("cookie=%s", headers["Cookie"])
	}
}

func TestMergeHeadersPrefersLocalValues(t *testing.T) {
	merged := contracts.MergeHeaders(
		map[string]string{"Cookie": "global", "Authorization": "Bearer global"},
		map[string]string{"Cookie": "local"},
	)

	if merged["Cookie"] != "local" {
		t.Fatalf("expected local cookie to win, got %q", merged["Cookie"])
	}
	if merged["Authorization"] != "Bearer global" {
		t.Fatalf("expected global authorization, got %q", merged["Authorization"])
	}
}
