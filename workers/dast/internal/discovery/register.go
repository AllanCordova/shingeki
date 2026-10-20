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

func ApplyRegistration(ctx context.Context, targetURL string, auth *contracts.TargetAuth) (bool, error) {
	if auth == nil || !auth.WantsRegistration() || !auth.HasCredentials() {
		return false, nil
	}

	email, username := registerIdentity(auth.Username)
	var lastErr error
	attempted := false

	for _, route := range registerJSONRoutes(targetURL, auth.RegisterURL) {
		attempted = true
		accepted, err := postJSONRegister(ctx, route, email, username, auth.Password, auth)
		if accepted {
			return true, nil
		}
		if err != nil {
			lastErr = err
		}
	}

	if formURL := targeturl.HTMLFormLoginURL(targetURL, auth.RegisterURL); formURL != "" {
		attempted = true
		if err := postFormRegister(ctx, formURL, email, username, auth.Password, auth); err != nil {
			lastErr = err
		} else {
			return true, nil
		}
	}

	if !attempted {
		return false, nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("registration failed")
	}
	return false, lastErr
}

func registerIdentity(username string) (email string, user string) {
	username = strings.TrimSpace(username)
	if strings.Contains(username, "@") {
		email = username
		user = strings.TrimSpace(strings.SplitN(username, "@", 2)[0])
		if user == "" {
			user = "scanner"
		}
		return email, user
	}
	if username == "" {
		username = "scanner"
	}
	return username + "@example.com", username
}

func registerJSONRoutes(targetURL, registerURL string) []string {
	origin := targeturl.Origin(targetURL)
	if origin == "" {
		origin = targeturl.Origin(registerURL)
	}
	registerURL = strings.TrimSpace(registerURL)
	if registerURL != "" {
		resolved := targeturl.ResolveAgainstOrigin(origin, registerURL)
		if resolved == "" || !targeturl.IsJSONAPIURL(resolved) {
			return nil
		}
		stripped := targeturl.StripFragment(resolved)
		if stripped == "" {
			return nil
		}
		return []string{stripped}
	}
	if origin == "" {
		return nil
	}
	return []string{
		origin + "/api/Users",
		origin + "/api/users",
		origin + "/api/register",
		origin + "/api/auth/register",
		origin + "/api/signup",
		origin + "/rest/user/register",
	}
}

func postJSONRegister(ctx context.Context, route, email, username, password string, auth *contracts.TargetAuth) (bool, error) {
	var payloads []any
	if auth != nil {
		if resolved := contracts.ResolveAuthBody(auth.RegisterBody, auth.Username, auth.Password); resolved != nil {
			payloads = []any{resolved}
		}
	}
	if len(payloads) == 0 {
		payloads = []any{
			map[string]string{
				"name":                  "Scanner User",
				"email":                 email,
				"username":              username,
				"password":              password,
				"password_confirmation": password,
				"passwordRepeat":        password,
			},
			map[string]string{"email": email, "password": password, "passwordRepeat": password},
			map[string]string{"email": email, "username": username, "password": password, "password_confirmation": password},
		}
	}
	var lastErr error
	for _, payload := range payloads {
		accepted, stop, err := sendJSONRegister(ctx, route, payload, auth)
		if accepted {
			return true, nil
		}
		if err != nil {
			lastErr = err
		}
		if stop {
			break
		}
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("json registration failed")
	}
	return false, lastErr
}

func sendJSONRegister(ctx context.Context, route string, payload any, auth *contracts.TargetAuth) (accepted bool, stop bool, err error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return false, false, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, route, bytes.NewReader(body))
	if err != nil {
		return false, false, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, true, fmt.Errorf("json registration: %w", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return false, false, fmt.Errorf("json registration read: %w", err)
	}
	applyHTTPCookies(auth, resp.Cookies(), cookieHost(route))
	if registrationAlreadyExists(resp.StatusCode, raw) {
		return true, true, nil
	}
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusMethodNotAllowed {
		return false, true, fmt.Errorf("json registration failed: HTTP %d", resp.StatusCode)
	}
	if resp.StatusCode >= 400 {
		return false, false, fmt.Errorf("json registration failed: HTTP %d", resp.StatusCode)
	}
	if !registrationAccepted(resp, raw) {
		return false, false, fmt.Errorf("json registration failed: HTTP %d", resp.StatusCode)
	}
	if token := extractLoginToken(raw); token != "" {
		contracts.ApplyBearerToken(auth, token)
	}
	return true, true, nil
}

func postFormRegister(ctx context.Context, route, email, username, password string, auth *contracts.TargetAuth) error {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return err
	}
	payload := url.Values{
		"name":                  {"Scanner User"},
		"email":                 {email},
		"username":              {username},
		"password":              {password},
		"password_confirmation": {password},
		"passwordRepeat":        {password},
	}
	if auth != nil {
		if fields := contracts.FlattenAuthFields(contracts.ResolveAuthBody(auth.RegisterBody, auth.Username, auth.Password)); len(fields) > 0 {
			payload = url.Values{}
			for key, value := range fields {
				payload.Set(key, value)
			}
		}
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
		return fmt.Errorf("form registration: %w", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("form registration read: %w", err)
	}

	parsed, err := url.Parse(route)
	if err != nil {
		return fmt.Errorf("form registration url: %w", err)
	}
	applyHTTPCookies(auth, jar.Cookies(parsed), parsed.Hostname())
	applyHTTPCookies(auth, resp.Cookies(), parsed.Hostname())

	if registrationAlreadyExists(resp.StatusCode, raw) {
		return nil
	}
	if resp.StatusCode >= 300 && resp.StatusCode < 400 {
		return nil
	}
	if resp.StatusCode < 400 && auth != nil && auth.HasSession() {
		return nil
	}
	return fmt.Errorf("form registration failed: HTTP %d", resp.StatusCode)
}

func registrationAlreadyExists(status int, body []byte) bool {
	if status == http.StatusConflict {
		return true
	}
	if status != http.StatusUnprocessableEntity && status != http.StatusBadRequest {
		return false
	}
	text := strings.ToLower(string(body))
	for _, hint := range []string{"already", "exists", "taken", "duplicate", "cadastr", "em uso", "unique"} {
		if strings.Contains(text, hint) {
			return true
		}
	}
	return false
}

func registrationAccepted(resp *http.Response, body []byte) bool {
	if resp == nil {
		return false
	}
	ct := strings.ToLower(resp.Header.Get("Content-Type"))
	if strings.Contains(ct, "json") {
		return true
	}
	trimmed := bytes.TrimSpace(body)
	if len(trimmed) > 0 && (trimmed[0] == '{' || trimmed[0] == '[') {
		return true
	}
	return len(resp.Cookies()) > 0
}
