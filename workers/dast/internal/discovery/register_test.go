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

func TestApplyRegistrationNoopWithoutRegisterMode(t *testing.T) {
	called := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{Username: "scan@example.com", Password: "secret"}
	registered, err := ApplyRegistration(context.Background(), server.URL, auth)
	if err != nil {
		t.Fatal(err)
	}
	if registered || called {
		t.Fatalf("registered=%v called=%v", registered, called)
	}
}

func TestApplyRegistrationCreatesJuiceShopUser(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/Users" || r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), `"email":"scanabcd@example.com"`) || !strings.Contains(string(body), `"passwordRepeat"`) {
			http.Error(w, "bad body", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = io.WriteString(w, `{"id":1}`)
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{
		Mode:     "register",
		Username: "scanabcd@example.com",
		Password: "Secretpass1!",
	}
	registered, err := ApplyRegistration(context.Background(), server.URL, auth)
	if err != nil {
		t.Fatal(err)
	}
	if !registered {
		t.Fatal("expected registration")
	}
}

func TestApplyRegistrationTreatsExistingAccountAsSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = io.WriteString(w, `{"message":"email already exists"}`)
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{
		Mode:        "register",
		RegisterURL: server.URL + "/api/Users",
		Username:    "scanabcd@example.com",
		Password:    "Secretpass1!",
	}
	registered, err := ApplyRegistration(context.Background(), server.URL, auth)
	if err != nil {
		t.Fatal(err)
	}
	if !registered {
		t.Fatal("expected existing account to count as registered")
	}
}

func TestApplyRegistrationPostsHTMLForm(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/register.php" {
			http.NotFound(w, r)
			return
		}
		http.SetCookie(w, &http.Cookie{Name: "PHPSESSID", Value: "created", Path: "/"})
		w.WriteHeader(http.StatusFound)
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{
		Mode:        "register",
		RegisterURL: server.URL + "/register.php",
		Username:    "scanabcd@example.com",
		Password:    "Secretpass1!",
	}
	registered, err := ApplyRegistration(context.Background(), server.URL, auth)
	if err != nil {
		t.Fatal(err)
	}
	if !registered || !auth.HasSession() {
		t.Fatalf("registered=%v cookies=%v", registered, auth.Cookies)
	}
}

func TestApplyRegistrationPostsNameAndConfirmation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/register" || r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		body, _ := io.ReadAll(r.Body)
		text := string(body)
		if !strings.Contains(text, `"name":"Scanner User"`) || !strings.Contains(text, `"password_confirmation"`) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnprocessableEntity)
			_, _ = io.WriteString(w, `{"message":"The name field is required.","errors":{"name":["The name field is required."]}}`)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = io.WriteString(w, `{"data":{"email":"scanabcd@example.com"},"token":"registered-token-0123456789abcdef"}`)
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{
		Mode:        "register",
		RegisterURL: server.URL + "/api/v1/register",
		Username:    "scanabcd@example.com",
		Password:    "Secretpass1!",
	}
	registered, err := ApplyRegistration(context.Background(), server.URL, auth)
	if err != nil {
		t.Fatal(err)
	}
	if !registered || auth.Headers["Authorization"] != "Bearer registered-token-0123456789abcdef" {
		t.Fatalf("registered=%v headers=%v", registered, auth.Headers)
	}
}

func TestExistingRegistrationLogsInOnSiblingRoute(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v1/register":
			w.WriteHeader(http.StatusUnprocessableEntity)
			_, _ = io.WriteString(w, `{"message":"The email has already been taken.","errors":{"email":["The email has already been taken."]}}`)
		case "/api/v1/login":
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"email":"scanabcd@example.com"`) {
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = io.WriteString(w, `{"message":"These credentials do not match our records."}`)
				return
			}
			_, _ = io.WriteString(w, `{"token":"login-token-0123456789abcdef"}`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{
		Mode:        "register",
		RegisterURL: server.URL + "/api/v1/register",
		Username:    "scanabcd@example.com",
		Password:    "Secretpass1!",
	}
	registered, err := ApplyRegistration(context.Background(), server.URL, auth)
	if err != nil || !registered {
		t.Fatalf("registered=%v err=%v", registered, err)
	}
	if auth.HasSession() {
		t.Fatal("an existing account must not count as a session")
	}
	if err := ApplyJSONLogin(context.Background(), server.URL, auth); err != nil {
		t.Fatal(err)
	}
	if auth.Headers["Authorization"] != "Bearer login-token-0123456789abcdef" {
		t.Fatalf("headers=%v", auth.Headers)
	}
}

func TestRegisterIdentitySplitsEmail(t *testing.T) {
	email, user := registerIdentity("scanabcd@example.com")
	if email != "scanabcd@example.com" || user != "scanabcd" {
		t.Fatalf("email=%s user=%s", email, user)
	}
}

func TestApplyRegistrationUsesConfiguredBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		text := string(body)
		if !strings.Contains(text, `"name":"Ana"`) || strings.Contains(text, "{{email}}") || strings.Contains(text, "passwordRepeat") {
			w.WriteHeader(http.StatusUnprocessableEntity)
			_, _ = io.WriteString(w, `{"message":"unexpected body"}`)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = io.WriteString(w, `{"token":"body-token-0123456789abcdef"}`)
	}))
	defer server.Close()

	auth := &contracts.TargetAuth{
		Mode:        "register",
		RegisterURL: server.URL + "/api/v1/register",
		Username:    "scanabcd@example.com",
		Password:    "Secretpass1!",
		RegisterBody: map[string]any{
			"name":     "Ana",
			"email":    "{{email}}",
			"password": "{{password}}",
		},
	}
	registered, err := ApplyRegistration(context.Background(), server.URL, auth)
	if err != nil || !registered {
		t.Fatalf("registered=%v err=%v", registered, err)
	}
	if auth.Headers["Authorization"] != "Bearer body-token-0123456789abcdef" {
		t.Fatalf("headers=%v", auth.Headers)
	}
}

func TestRegisterJSONRoutesSkipPageURL(t *testing.T) {
	routes := registerJSONRoutes("https://shop.test", "https://shop.test/register")
	if len(routes) != 0 {
		t.Fatalf("page routes=%v", routes)
	}
	api := registerJSONRoutes("https://shop.test", "https://shop.test/api/v1/register")
	if len(api) != 1 || api[0] != "https://shop.test/api/v1/register" {
		t.Fatalf("api routes=%v", api)
	}
}

func TestRegisterJSONRoutesSkipHashSignup(t *testing.T) {
	routes := registerJSONRoutes("https://shop.test", "https://shop.test/#/register")
	if len(routes) != 0 {
		t.Fatalf("routes=%v", routes)
	}
}
