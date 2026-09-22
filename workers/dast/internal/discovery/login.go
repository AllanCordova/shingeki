package discovery

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func ApplyJSONLogin(ctx context.Context, targetURL string, auth *contracts.TargetAuth) error {
	if !auth.HasCredentials() {
		return nil
	}
	route := targeturl.JSONLoginURL(targetURL)
	if route == "" {
		return fmt.Errorf("invalid target url")
	}

	bodies := []map[string]string{
		{"email": strings.TrimSpace(auth.Username), "password": auth.Password},
		{"username": strings.TrimSpace(auth.Username), "password": auth.Password},
	}

	var lastErr error
	for _, payload := range bodies {
		token, err := postJSONLogin(ctx, route, payload)
		if err != nil {
			lastErr = err
			continue
		}
		contracts.ApplyBearerToken(auth, token)
		if auth.Type == "" {
			auth.Type = "credentials"
		}
		return nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("json login failed")
	}
	return lastErr
}

func postJSONLogin(ctx context.Context, route string, payload map[string]string) (string, error) {
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
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("json login failed: HTTP %d", resp.StatusCode)
	}
	token := extractLoginToken(raw)
	if token == "" {
		return "", fmt.Errorf("json login: missing token")
	}
	return token, nil
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
