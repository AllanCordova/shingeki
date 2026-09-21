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

func TestExtractLoginTokenShapes(t *testing.T) {
	if got := extractLoginToken([]byte(`{"access_token":"abc"}`)); got != "abc" {
		t.Fatalf("got %q", got)
	}
	if got := extractLoginToken([]byte(`{"data":{"token":"xyz"}}`)); got != "xyz" {
		t.Fatalf("got %q", got)
	}
}
