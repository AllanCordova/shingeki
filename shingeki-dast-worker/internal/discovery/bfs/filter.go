package bfs

import (
	"net/url"
	"strings"
)

var blockedHostSuffixes = []string{
	"cloudflareinsights.com",
	"google-analytics.com",
	"googletagmanager.com",
	"googleadservices.com",
	"doubleclick.net",
	"facebook.net",
	"facebook.com",
	"hotjar.com",
	"sentry.io",
	"newrelic.com",
	"nr-data.net",
	"segment.com",
	"segment.io",
	"intercom.io",
	"zendesk.com",
	"clarity.ms",
}

var blockedPathPrefixes = []string{
	"/cdn-cgi/",
	"/wp-includes/",
	"/wp-content/uploads/",
	"/wp-content/themes/",
	"/wp-content/plugins/",
	"/.well-known/",
}

var blockedExactPaths = map[string]struct{}{
	"/favicon.ico": {},
	"/robots.txt":  {},
	"/sitemap.xml": {},
}

func IsBlockedDiscoveryURL(rawURL string) bool {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" {
		return true
	}

	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return true
	}

	host := strings.ToLower(parsed.Hostname())
	for _, suffix := range blockedHostSuffixes {
		if host == suffix || strings.HasSuffix(host, "."+suffix) {
			return true
		}
	}

	path := strings.ToLower(parsed.EscapedPath())
	if path == "" {
		path = "/"
	}
	if _, ok := blockedExactPaths[path]; ok {
		return true
	}
	for _, prefix := range blockedPathPrefixes {
		if strings.HasPrefix(path, prefix) {
			return true
		}
	}

	return IsSkippableAsset(rawURL)
}

func IsAttackableDiscoveryURL(targetURL, candidate string) bool {
	if !SameOrigin(targetURL, candidate) {
		return false
	}
	return !IsBlockedDiscoveryURL(candidate)
}
