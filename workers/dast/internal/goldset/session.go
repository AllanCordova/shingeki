package goldset

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/pkg/targeturl"
)

const (
	DefaultAdminEmail    = "admin@juice-sh.op"
	DefaultAdminPassword = "admin123"
)

type Session struct {
	Email string
	Token string
	Bid   string
}

func Login(ctx context.Context, targetURL, email, password string) (Session, error) {
	route := targeturl.JSONLoginURL(targetURL)
	if route == "" {
		return Session{}, fmt.Errorf("invalid target url")
	}
	email = strings.TrimSpace(email)
	if email == "" {
		email = DefaultAdminEmail
	}
	if password == "" {
		password = DefaultAdminPassword
	}

	payload, err := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})
	if err != nil {
		return Session{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, route, bytes.NewReader(payload))
	if err != nil {
		return Session{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return Session{}, fmt.Errorf("juice shop login: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return Session{}, fmt.Errorf("juice shop login read: %w", err)
	}
	if resp.StatusCode >= 400 {
		return Session{}, fmt.Errorf("juice shop login failed: HTTP %d", resp.StatusCode)
	}

	var parsed struct {
		Authentication struct {
			Token string          `json:"token"`
			Bid   json.RawMessage `json:"bid"`
			Umail string          `json:"umail"`
		} `json:"authentication"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return Session{}, fmt.Errorf("juice shop login json: %w", err)
	}
	token := strings.TrimSpace(parsed.Authentication.Token)
	if token == "" {
		return Session{}, fmt.Errorf("juice shop login: missing token")
	}
	bid := strings.TrimSpace(string(parsed.Authentication.Bid))
	bid = strings.Trim(bid, `"`)
	if n, err := strconv.ParseFloat(bid, 64); err == nil && n == float64(int64(n)) {
		bid = strconv.FormatInt(int64(n), 10)
	}
	if bid == "" || bid == "null" {
		bid = "1"
	}
	umail := strings.TrimSpace(parsed.Authentication.Umail)
	if umail == "" {
		umail = email
	}
	return Session{Email: umail, Token: token, Bid: bid}, nil
}

func BearerAuth(session Session) map[string]string {
	if strings.TrimSpace(session.Token) == "" {
		return nil
	}
	return map[string]string{"Authorization": "Bearer " + session.Token}
}
