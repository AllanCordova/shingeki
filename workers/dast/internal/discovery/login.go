package discovery

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func ApplyJSONLogin(ctx context.Context, targetURL string, auth *contracts.TargetAuth) error {
	if !auth.HasCredentials() {
		return nil
	}
	loginURL := ""
	if auth != nil {
		loginURL = auth.LoginURL
	}
	route := targeturl.CredentialJSONLoginURL(targetURL, loginURL)
	if route == "" {
		return nil
	}

	bodies := []map[string]string{
		{"email": strings.TrimSpace(auth.Username), "password": auth.Password},
		{"username": strings.TrimSpace(auth.Username), "password": auth.Password},
	}

	var lastErr error
	for _, payload := range bodies {
		token, err := postJSONLogin(ctx, route, payload, auth)
		if err != nil {
			lastErr = err
			continue
		}
		if token != "" {
			contracts.ApplyBearerToken(auth, token)
		}
		if token != "" || auth.HasSession() {
			if auth.Type == "" {
				auth.Type = "credentials"
			}
			return nil
		}
		lastErr = fmt.Errorf("json login: missing token")
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("json login failed")
	}
	return lastErr
}

func ApplyHTTPFormLogin(ctx context.Context, targetURL string, auth *contracts.TargetAuth) error {
	if auth == nil || !auth.HasCredentials() || auth.HasSession() {
		return nil
	}
	route := targeturl.HTMLFormLoginURL(targetURL, auth.LoginURL)
	if route == "" {
		return nil
	}

	bodies := []url.Values{
		{"email": {strings.TrimSpace(auth.Username)}, "password": {auth.Password}},
		{"username": {strings.TrimSpace(auth.Username)}, "password": {auth.Password}},
	}

	var lastErr error
	for _, payload := range bodies {
		if err := postFormLogin(ctx, route, payload, auth); err != nil {
			lastErr = err
			continue
		}
		if auth.HasSession() {
			if auth.Type == "" {
				auth.Type = "credentials"
			}
			return nil
		}
		lastErr = fmt.Errorf("form login: missing session cookie")
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("form login failed")
	}
	return lastErr
}

func postJSONLogin(ctx context.Context, route string, payload map[string]string, auth *contracts.TargetAuth) (string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, route, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("json login: %w", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("json login read: %w", err)
	}
	applyHTTPCookies(auth, resp.Cookies(), cookieHost(route))
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("json login failed: HTTP %d", resp.StatusCode)
	}
	token := extractLoginToken(raw)
	if token == "" && (auth == nil || !auth.HasSession()) {
		return "", fmt.Errorf("json login: missing token")
	}
	return token, nil
}

func postFormLogin(ctx context.Context, route string, payload url.Values, auth *contracts.TargetAuth) error {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, route, strings.NewReader(payload.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	client := &http.Client{
		Timeout: 8 * time.Second,
		Jar:     jar,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("form login: %w", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 400 {
		return fmt.Errorf("form login failed: HTTP %d", resp.StatusCode)
	}

	parsed, err := url.Parse(route)
	if err != nil {
		return fmt.Errorf("form login url: %w", err)
	}
	applyHTTPCookies(auth, jar.Cookies(parsed), parsed.Hostname())
	applyHTTPCookies(auth, resp.Cookies(), parsed.Hostname())
	return nil
}

func applyHTTPCookies(auth *contracts.TargetAuth, cookies []*http.Cookie, host string) {
	if auth == nil || len(cookies) == 0 {
		return
	}
	extra := make([]contracts.CapturedCookie, 0, len(cookies))
	for _, cookie := range cookies {
		if cookie == nil || strings.TrimSpace(cookie.Name) == "" || strings.TrimSpace(cookie.Value) == "" {
			continue
		}
		domain := strings.TrimSpace(cookie.Domain)
		if domain == "" {
			domain = host
		}
		path := strings.TrimSpace(cookie.Path)
		if path == "" {
			path = "/"
		}
		extra = append(extra, contracts.CapturedCookie{
			Name:     cookie.Name,
			Value:    cookie.Value,
			Domain:   domain,
			Path:     path,
			Secure:   cookie.Secure,
			HTTPOnly: cookie.HttpOnly,
		})
	}
	auth.Cookies = mergeCapturedAuthCookies(auth.Cookies, extra)
}

func mergeCapturedAuthCookies(existing, extra []contracts.CapturedCookie) []contracts.CapturedCookie {
	seen := map[string]int{}
	out := make([]contracts.CapturedCookie, 0, len(existing)+len(extra))
	for _, cookie := range existing {
		key := cookie.Name + "|" + cookie.Domain + "|" + cookie.Path
		seen[key] = len(out)
		out = append(out, cookie)
	}
	for _, cookie := range extra {
		key := cookie.Name + "|" + cookie.Domain + "|" + cookie.Path
		if idx, ok := seen[key]; ok {
			out[idx] = cookie
			continue
		}
		seen[key] = len(out)
		out = append(out, cookie)
	}
	return out
}

func cookieHost(route string) string {
	parsed, err := url.Parse(route)
	if err != nil {
		return ""
	}
	return parsed.Hostname()
}

func extractLoginToken(raw []byte) string {
	var nested struct {
		Authentication struct {
			Token string `json:"token"`
		} `json:"authentication"`
		Token       string `json:"token"`
		AccessToken string `json:"access_token"`
		Data        struct {
			Token       string `json:"token"`
			AccessToken string `json:"access_token"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &nested); err != nil {
		return ""
	}
	for _, token := range []string{
		nested.Authentication.Token,
		nested.Token,
		nested.AccessToken,
		nested.Data.Token,
		nested.Data.AccessToken,
	} {
		if strings.TrimSpace(token) != "" {
			return strings.TrimSpace(token)
		}
	}
	return ""
}
