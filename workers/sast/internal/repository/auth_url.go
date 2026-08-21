package repository

import (
	"net/url"
	"strings"
)

// withGitHubToken injects x-access-token into https://github.com/... URLs when a token is set.
func withGitHubToken(repositoryURL, token string) string {
	repositoryURL = strings.TrimSpace(repositoryURL)
	token = strings.TrimSpace(token)

	if token == "" || !strings.HasPrefix(repositoryURL, "https://") {
		return repositoryURL
	}

	parsed, err := url.Parse(repositoryURL)
	if err != nil || !strings.EqualFold(parsed.Host, "github.com") {
		return repositoryURL
	}

	if parsed.User != nil {
		return repositoryURL
	}

	parsed.User = url.UserPassword("x-access-token", token)

	return parsed.String()
}
