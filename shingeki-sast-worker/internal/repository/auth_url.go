package repository

import (
	"encoding/base64"
	"fmt"
	"net/url"
	"os"
	"path"
	"strings"
)

func AssertSafeRepositoryURL(raw string) error {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return fmt.Errorf("invalid repository url")
	}
	if parsed.Scheme != "https" {
		return fmt.Errorf("repository url scheme must be https")
	}
	if !strings.EqualFold(parsed.Host, "github.com") {
		return fmt.Errorf("repository url host must be github.com")
	}
	if parsed.User != nil {
		return fmt.Errorf("repository url must not include credentials")
	}

	cleanPath := path.Clean("/" + strings.TrimPrefix(parsed.Path, "/"))
	parts := strings.Split(strings.Trim(cleanPath, "/"), "/")
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" || parts[0] == "." || parts[1] == "." {
		return fmt.Errorf("repository url path must be owner/repo")
	}

	return nil
}

func cloneEnv(token string) []string {
	env := append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	token = strings.TrimSpace(token)
	if token == "" {
		return env
	}

	auth := base64.StdEncoding.EncodeToString([]byte("x-access-token:" + token))
	return append(env,
		"GIT_CONFIG_COUNT=1",
		"GIT_CONFIG_KEY_0=http.https://github.com/.extraheader",
		"GIT_CONFIG_VALUE_0=AUTHORIZATION: basic "+auth,
	)
}

func redactSecrets(text, token string) string {
	token = strings.TrimSpace(token)
	if token == "" || text == "" {
		return text
	}
	return strings.ReplaceAll(text, token, "[REDACTED]")
}
