package discovery

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestApplyJSONLoginNoopWithoutCredentials(t *testing.T) {
	auth := &contracts.TargetAuth{}
	if err := ApplyJSONLogin(context.Background(), "http://shop.test/", auth); err != nil {
		t.Fatal(err)
	}
	if len(auth.Headers) != 0 {
		t.Fatalf("headers=%v", auth.Headers)
	}
}

func TestApplyJSONLoginReadsJuiceShopToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/rest/user/login" {
			http.NotFound(w, r)
			return
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), `"email":"admin@juice-sh.op"`) {
			http.Error(w, "bad body", http.StatusBadRequest)
			return
		}
		_, _ = io.WriteString(w, `{"authentication":{"token":"jwt.token.sig","bid":1}}`)
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{
		Type:     "credentials",
		Username: "admin@juice-sh.op",
		Password: "admin123",
	}
	if err := ApplyJSONLogin(context.Background(), server.URL, auth); err != nil {
		t.Fatal(err)
	}
	if auth.Headers["Authorization"] != "Bearer jwt.token.sig" {
		t.Fatalf("headers=%v", auth.Headers)
	}
	if auth.Storage.Local["token"] != "jwt.token.sig" {
		t.Fatalf("storage=%v", auth.Storage.Local)
	}
}

func TestApplyJSONLoginUsesConfiguredAPIPath(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/auth/login" {
			http.Error(w, "wrong path "+r.URL.Path, http.StatusNotFound)
			return
		}
		_, _ = io.WriteString(w, `{"access_token":"custom.jwt"}`)
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{
		Type:     "credentials",
		LoginURL: server.URL + "/api/v1/auth/login",
		Username: "scanner@example.com",
		Password: "secret",
	}
	if err := ApplyJSONLogin(context.Background(), server.URL, auth); err != nil {
		t.Fatal(err)
	}
	if auth.Headers["Authorization"] != "Bearer custom.jwt" {
		t.Fatalf("headers=%v", auth.Headers)
	}
}

func TestApplyJSONLoginSkipsHTMLFormLoginURL(t *testing.T) {
	called := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		http.NotFound(w, r)
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{
		Type:     "credentials",
		LoginURL: server.URL + "/login.php",
		Username: "guest@vuln.local",
		Password: "guest123",
	}
	if err := ApplyJSONLogin(context.Background(), server.URL, auth); err != nil {
		t.Fatal(err)
	}
	if called {
		t.Fatal("must not POST JSON to a PHP login page")
	}
	if auth.HasSession() {
		t.Fatal("json skip must not invent a session")
	}
}

func TestApplyHTTPFormLoginStoresSessionCookie(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/login.php" || r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		if err := r.ParseForm(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if r.Form.Get("email") != "guest@vuln.local" || r.Form.Get("password") != "guest123" {
			http.Error(w, "invalid", http.StatusUnauthorized)
			return
		}
		http.SetCookie(w, &http.Cookie{Name: "PHPSESSID", Value: "lab-session", Path: "/"})
		http.Redirect(w, r, "/dashboard.php", http.StatusFound)
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{
		Type:     "credentials",
		LoginURL: server.URL + "/login.php",
		Username: "guest@vuln.local",
		Password: "guest123",
	}
	if err := ApplyHTTPFormLogin(context.Background(), server.URL, auth); err != nil {
		t.Fatal(err)
	}
	if !auth.HasSession() {
		t.Fatalf("expected session cookies, got %#v", auth.Cookies)
	}
	found := false
	for _, cookie := range auth.Cookies {
		if cookie.Name == "PHPSESSID" && cookie.Value == "lab-session" {
			found = true
		}
	}
	if !found {
		t.Fatalf("cookies=%#v", auth.Cookies)
	}
}

func TestExtractLoginTokenShapes(t *testing.T) {
	if got := extractLoginToken([]byte(`{"access_token":"abc"}`)); got != "abc" {
		t.Fatalf("got %q", got)
	}
	if got := extractLoginToken([]byte(`{"data":{"token":"xyz"}}`)); got != "xyz" {
		t.Fatalf("got %q", got)
	}
}
