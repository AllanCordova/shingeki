package contracts_test

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestMaterializeBrowserState(t *testing.T) {
	key := []byte("0123456789abcdef0123456789abcdef")
	t.Setenv("BROWSER_STATE_KEY", base64.StdEncoding.EncodeToString(key))

	plain := []byte(`{"cookies":[{"name":"session_id","value":"xyz123","domain":"alvo.com","path":"/","expires":1735689600,"httpOnly":true,"secure":true,"sameSite":"Lax"}],"origins":[{"origin":"https://alvo.com","localStorage":[{"name":"auth_token","value":"eyJhbGciOiJIUz"}],"sessionStorage":[{"name":"sid","value":"abc"}]}]}`)
	auth := &contracts.TargetAuth{
		Type:  "browser_state",
		State: encryptState(t, key, plain),
	}
	if err := auth.MaterializeBrowserState(); err != nil {
		t.Fatalf("materialize: %v", err)
	}
	if len(auth.Cookies) != 1 || auth.Cookies[0].Name != "session_id" || !auth.Cookies[0].HTTPOnly || auth.Cookies[0].SameSite != "Lax" {
		t.Fatalf("cookies=%+v", auth.Cookies)
	}
	if auth.Cookies[0].ExpirationDate != 1735689600 {
		t.Fatalf("expires=%v", auth.Cookies[0].ExpirationDate)
	}
	origin := auth.Storage.Origins[0]
	if origin.Local["auth_token"] != "eyJhbGciOiJIUz" || origin.Session["sid"] != "abc" {
		t.Fatalf("storage=%+v", origin)
	}
	if auth.State != nil {
		t.Fatal("ciphertext should not stay on the auth object")
	}
}

func TestHeadersForURLDoesNotLeaveTheTarget(t *testing.T) {
	auth := &contracts.TargetAuth{
		Cookies: []contracts.CapturedCookie{
			{Name: "sid", Value: "secret", Domain: "alvo.com", Path: "/"},
			{Name: "third", Value: "nope", Domain: "evil.test", Path: "/"},
		},
		Storage: &contracts.TargetStorage{Local: map[string]string{"access_token": "header.payload.signature"}},
	}

	inScope := contracts.HeadersForURL(auth, "https://alvo.com", "https://api.alvo.com/v1")
	if inScope["Cookie"] != "sid=secret" {
		t.Fatalf("cookie=%q", inScope["Cookie"])
	}
	if inScope["Authorization"] != "Bearer header.payload.signature" {
		t.Fatalf("authorization=%q", inScope["Authorization"])
	}

	out := contracts.HeadersForURL(auth, "https://alvo.com", "https://evil.test/collect")
	if len(out) != 0 {
		t.Fatalf("leaked headers %#v", out)
	}
}

func encryptState(t *testing.T, key, plain []byte) *contracts.BrowserStateEnvelope {
	t.Helper()
	block, err := aes.NewCipher(key)
	if err != nil {
		t.Fatal(err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		t.Fatal(err)
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		t.Fatal(err)
	}
	ciphertext := gcm.Seal(nil, nonce, plain, nil)
	return &contracts.BrowserStateEnvelope{
		V:     1,
		Alg:   "AES-256-GCM",
		Nonce: base64.StdEncoding.EncodeToString(nonce),
		CT:    base64.StdEncoding.EncodeToString(ciphertext),
	}
}
