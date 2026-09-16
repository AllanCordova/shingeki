package injectors_test

import (
	"net/url"
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack/injectors"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestBuildQueryInjection(t *testing.T) {
	job := types.Job{
		Attack: contracts.AttackItem{TargetLocation: "QUERY_PARAMETER"},
		Vector: contracts.AttackVector{
			Route:          "https://example.com/search?q=test",
			Method:         "GET",
			TargetLocation: "QUERY_PARAMETER",
			Params:         map[string]string{"q": "test"},
		},
		ParamKey: "q",
		Payload:  types.PayloadSpec{Value: "' OR 1=1 --"},
	}

	spec, err := injectors.BuildAttack(job)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	parsed, _ := url.Parse(spec.URL)
	if parsed.Query().Get("q") != "' OR 1=1 --" {
		t.Fatalf("unexpected query value: %s", parsed.Query().Get("q"))
	}
}

func TestBuildQueryInjectionIntoHashFragment(t *testing.T) {
	payload := `<iframe src="javascript:alert(` + "`xss`" + `)">`
	job := types.Job{
		Attack: contracts.AttackItem{TargetLocation: "QUERY_PARAMETER"},
		Vector: contracts.AttackVector{
			Route:          "http://shop.test/#/search?q=",
			Method:         "GET",
			TargetLocation: "QUERY_PARAMETER",
			Params:         map[string]string{"q": ""},
		},
		ParamKey: "q",
		Payload:  types.PayloadSpec{Value: payload},
	}

	spec, err := injectors.BuildAttack(job)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	parsed, err := url.Parse(spec.URL)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if parsed.RawQuery != "" {
		t.Fatalf("hash-routed search must not put q on the HTTP query, got %q", spec.URL)
	}
	if strings.Contains(spec.URL, "%253C") {
		t.Fatalf("iframe payload must not be double-encoded, got %q", spec.URL)
	}
	if !strings.Contains(spec.URL, "/#/search") || !strings.Contains(spec.URL, "%3Ciframe") {
		t.Fatalf("expected single-encoded iframe in hash search URL, got %q fragment=%q", spec.URL, parsed.Fragment)
	}
}

func TestBuildJSONInjection(t *testing.T) {
	job := types.Job{
		Attack: contracts.AttackItem{TargetLocation: "JSON_BODY"},
		Vector: contracts.AttackVector{
			Route:          "https://example.com/api/login",
			Method:         "POST",
			TargetLocation: "JSON_BODY",
			Params:         map[string]string{"email": "a@b.com"},
		},
		ParamKey: "email",
		Payload:  types.PayloadSpec{Value: "<script>alert(1)</script>"},
	}

	spec, err := injectors.BuildAttack(job)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(spec.Body, "alert(1)") {
		t.Fatalf("expected injected body, got %s", spec.Body)
	}
	if spec.Headers["Content-Type"] != "application/json" {
		t.Fatalf("expected json content type")
	}
}

func TestBuildCookieMergesExistingHeader(t *testing.T) {
	job := types.Job{
		Attack: contracts.AttackItem{TargetLocation: "COOKIE"},
		Vector: contracts.AttackVector{
			Route:          "https://example.com/app",
			Method:         "GET",
			TargetLocation: "COOKIE",
			Headers:        map[string]string{"Cookie": "session=abc"},
		},
		Payload: types.PayloadSpec{Field: "inject", Value: "1' OR '1'='1"},
	}

	spec, err := injectors.BuildAttack(job)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if spec.Headers["Cookie"] != "session=abc; inject=1' OR '1'='1" {
		t.Fatalf("expected merged cookie header, got %q", spec.Headers["Cookie"])
	}
}

func TestBuildCookieReplacesSameName(t *testing.T) {
	job := types.Job{
		Attack: contracts.AttackItem{TargetLocation: "COOKIE"},
		Vector: contracts.AttackVector{
			Route:          "https://example.com/app",
			Method:         "GET",
			TargetLocation: "COOKIE",
			Headers:        map[string]string{"Cookie": "session=abc"},
		},
		ParamKey: "session",
		Payload:  types.PayloadSpec{Value: "injected"},
	}

	spec, err := injectors.BuildAttack(job)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if spec.Headers["Cookie"] != "session=injected" {
		t.Fatalf("expected replaced session cookie, got %q", spec.Headers["Cookie"])
	}
}

func TestBuildHeaderUsesParamKey(t *testing.T) {
	job := types.Job{
		Attack: contracts.AttackItem{TargetLocation: "HEADER"},
		Vector: contracts.AttackVector{
			Route:          "https://example.com/app",
			Method:         "GET",
			TargetLocation: "HEADER",
		},
		ParamKey: "X-Custom",
		Payload:  types.PayloadSpec{Value: "payload"},
	}
	spec, err := injectors.BuildAttack(job)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if spec.Headers["X-Custom"] != "payload" {
		t.Fatalf("expected ParamKey header, got %+v", spec.Headers)
	}
}

func TestBuildPathReplacesLastSegmentAndEncodesDotDot(t *testing.T) {
	job := types.Job{
		Attack: contracts.AttackItem{TargetLocation: "URL_PATH"},
		Vector: contracts.AttackVector{
			Route:          "http://127.0.0.1:8090/browse/welcome.txt",
			Method:         "GET",
			TargetLocation: "URL_PATH",
		},
		Payload: types.PayloadSpec{Value: "../storage/secret.txt"},
	}

	spec, err := injectors.BuildAttack(job)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	parsed, err := url.Parse(spec.URL)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if parsed.EscapedPath() != "/browse/%2e%2e%2fstorage%2fsecret.txt" && parsed.RawPath != "/browse/%2e%2e%2fstorage%2fsecret.txt" {
		t.Fatalf("expected encoded traversal path, got path=%q raw=%q url=%q", parsed.EscapedPath(), parsed.RawPath, spec.URL)
	}
	if strings.Contains(spec.URL, "/browse/welcome.txt/") {
		t.Fatalf("payload must replace the file segment, got %s", spec.URL)
	}
}

func TestBuildHeaderJWTNone(t *testing.T) {
	token := "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.sig"
	job := types.Job{
		Attack: contracts.AttackItem{Category: "JWT_CONFUSION", TargetLocation: "HEADER"},
		Vector: contracts.AttackVector{
			Route:   "http://shop.test/api/Users/",
			Method:  "GET",
			Headers: map[string]string{"Authorization": "Bearer " + token},
		},
		Payload: types.PayloadSpec{Value: "none"},
	}
	attackSpec, err := injectors.BuildAttack(job)
	if err != nil {
		t.Fatal(err)
	}
	auth := attackSpec.Headers["Authorization"]
	if !strings.HasPrefix(auth, "Bearer ") || !strings.HasSuffix(auth, ".") || strings.Contains(auth, "sig") {
		t.Fatalf("expected none JWT, got %q", auth)
	}
	baseSpec, err := injectors.BuildBaseline(job)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(baseSpec.Headers["Authorization"], "invalid-signature") {
		t.Fatalf("baseline must use a broken signature, got %q", baseSpec.Headers["Authorization"])
	}
}
