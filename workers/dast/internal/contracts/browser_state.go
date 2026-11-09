package contracts

import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
)

var ErrBrowserState = errors.New("browser state")

type BrowserStateEnvelope struct {
	V     int    `json:"v"`
	Alg   string `json:"alg"`
	Nonce string `json:"nonce"`
	CT    string `json:"ct"`
}

type playwrightState struct {
	Cookies []playwrightCookie `json:"cookies"`
	Origins []playwrightOrigin `json:"origins"`
}

type playwrightCookie struct {
	Name     string  `json:"name"`
	Value    string  `json:"value"`
	Domain   string  `json:"domain"`
	Path     string  `json:"path"`
	Expires  float64 `json:"expires"`
	HTTPOnly bool    `json:"httpOnly"`
	Secure   bool    `json:"secure"`
	SameSite string  `json:"sameSite"`
}

type playwrightOrigin struct {
	Origin         string           `json:"origin"`
	LocalStorage   []playwrightItem `json:"localStorage"`
	SessionStorage []playwrightItem `json:"sessionStorage"`
}

type playwrightItem struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func (auth *TargetAuth) MaterializeBrowserState() error {
	if auth == nil || !strings.EqualFold(strings.TrimSpace(auth.Type), "browser_state") {
		return nil
	}
	if auth.State == nil {
		return fmt.Errorf("%w: missing envelope", ErrBrowserState)
	}

	key, err := browserStateKey()
	if err != nil {
		return err
	}
	plain, err := decryptBrowserState(key, *auth.State)
	if err != nil {
		return err
	}

	var state playwrightState
	if err := json.Unmarshal(plain, &state); err != nil {
		return fmt.Errorf("%w: decode storage state: %w", ErrBrowserState, err)
	}

	auth.Cookies = cookiesFromPlaywright(state.Cookies)
	auth.Storage = storageFromPlaywright(state.Origins)
	auth.State = nil
	if !auth.HasSession() {
		return fmt.Errorf("%w: captured session is empty", ErrBrowserState)
	}
	return nil
}

func browserStateKey() ([]byte, error) {
	raw := strings.TrimSpace(os.Getenv("BROWSER_STATE_KEY"))
	if raw == "" {
		return nil, fmt.Errorf("%w: BROWSER_STATE_KEY is required", ErrBrowserState)
	}
	key, err := base64.StdEncoding.DecodeString(raw)
	if err != nil || len(key) != 32 {
		return nil, fmt.Errorf("%w: BROWSER_STATE_KEY must be 32 bytes of base64", ErrBrowserState)
	}
	return key, nil
}

func decryptBrowserState(key []byte, envelope BrowserStateEnvelope) ([]byte, error) {
	if envelope.V != 1 || !strings.EqualFold(envelope.Alg, "AES-256-GCM") {
		return nil, fmt.Errorf("%w: unsupported envelope", ErrBrowserState)
	}
	nonce, err := base64.StdEncoding.DecodeString(envelope.Nonce)
	if err != nil || len(nonce) != 12 {
		return nil, fmt.Errorf("%w: invalid nonce", ErrBrowserState)
	}
	ciphertext, err := base64.StdEncoding.DecodeString(envelope.CT)
	if err != nil || len(ciphertext) < 16 {
		return nil, fmt.Errorf("%w: invalid ciphertext", ErrBrowserState)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrBrowserState, err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrBrowserState, err)
	}
	plain, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("%w: decrypt failed", ErrBrowserState)
	}
	return plain, nil
}

func cookiesFromPlaywright(cookies []playwrightCookie) []CapturedCookie {
	out := make([]CapturedCookie, 0, len(cookies))
	for _, cookie := range cookies {
		name := strings.TrimSpace(cookie.Name)
		if name == "" || cookie.Value == "" {
			continue
		}
		captured := CapturedCookie{
			Name:     name,
			Value:    cookie.Value,
			Domain:   cookie.Domain,
			Path:     cookie.Path,
			Secure:   cookie.Secure,
			HTTPOnly: cookie.HTTPOnly,
			SameSite: cookie.SameSite,
		}
		if cookie.Expires < 0 {
			captured.Session = true
		} else if cookie.Expires > 0 {
			captured.ExpirationDate = cookie.Expires
		}
		out = append(out, captured)
	}
	return out
}

func storageFromPlaywright(origins []playwrightOrigin) *TargetStorage {
	if len(origins) == 0 {
		return nil
	}
	rows := make([]OriginStorage, 0, len(origins))
	for _, origin := range origins {
		rawOrigin := strings.TrimSpace(origin.Origin)
		if rawOrigin == "" {
			continue
		}
		local := itemsToMap(origin.LocalStorage)
		session := itemsToMap(origin.SessionStorage)
		if len(local) == 0 && len(session) == 0 {
			continue
		}
		rows = append(rows, OriginStorage{
			Origin:  rawOrigin,
			Local:   local,
			Session: session,
		})
	}
	if len(rows) == 0 {
		return nil
	}
	return &TargetStorage{Origins: rows}
}

func itemsToMap(items []playwrightItem) StringMap {
	if len(items) == 0 {
		return nil
	}
	out := StringMap{}
	for _, item := range items {
		name := strings.TrimSpace(item.Name)
		if name == "" {
			continue
		}
		out[name] = item.Value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
