package repository

import (
	"fmt"
	"net"
	"net/url"
	"regexp"
	"strings"
)

var lookupIPs = net.LookupIP

var (
	accessTokenPattern = regexp.MustCompile(`(?i)(x-access-token:)([^@/\s]+)`)
	userinfoPattern    = regexp.MustCompile(`(https?://)([^:@/]+):([^@/]+)@`)
)

func RedactedURL(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Scheme == "" {
		return raw
	}
	return parsed.Redacted()
}

func redactSecrets(raw, token string) string {
	if token != "" {
		raw = strings.ReplaceAll(raw, token, "***")
	}
	raw = accessTokenPattern.ReplaceAllString(raw, "${1}***")
	raw = userinfoPattern.ReplaceAllString(raw, "${1}${2}:***@")
	return raw
}

func validateCloneURL(raw string, allowedHosts []string) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return nil, fmt.Errorf("invalid repository url")
	}
	if !strings.EqualFold(parsed.Scheme, "https") {
		return nil, fmt.Errorf("repository url scheme must be https")
	}
	if parsed.Host == "" {
		return nil, fmt.Errorf("repository url host is required")
	}
	if parsed.User != nil {
		return nil, fmt.Errorf("repository url must not include credentials")
	}
	if parsed.Path == "" || parsed.Path == "/" {
		return nil, fmt.Errorf("repository url path is required")
	}

	host := parsed.Hostname()
	if !hostAllowed(host, allowedHosts) {
		return nil, fmt.Errorf("repository host is not allowed")
	}
	if err := assertPublicHost(host); err != nil {
		return nil, err
	}

	return parsed, nil
}

func hostAllowed(host string, allowed []string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	for _, candidate := range allowed {
		candidate = strings.ToLower(strings.TrimSpace(candidate))
		if candidate == "" {
			continue
		}
		if host == candidate {
			return true
		}
		if isGitHubHost(host) && isGitHubHost(candidate) {
			return true
		}
	}
	return false
}

func isGitHubHost(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	return host == "github.com" || host == "www.github.com"
}

func assertPublicHost(host string) error {
	host = strings.ToLower(strings.TrimSpace(host))
	host = strings.Trim(host, "[]")
	if host == "metadata.google.internal" || strings.HasSuffix(host, ".metadata.google.internal") {
		return fmt.Errorf("repository host is not allowed")
	}

	ips := []net.IP{}
	if ip := net.ParseIP(host); ip != nil {
		ips = append(ips, ip)
	} else {
		resolved, err := lookupIPs(host)
		if err != nil {
			return fmt.Errorf("resolve repository host: %w", err)
		}
		ips = resolved
	}

	if len(ips) == 0 {
		return fmt.Errorf("repository host is not allowed")
	}
	for _, ip := range ips {
		if disallowedIP(ip) {
			return fmt.Errorf("repository host is not allowed")
		}
	}
	return nil
}

func disallowedIP(ip net.IP) bool {
	return ip == nil ||
		ip.IsLoopback() ||
		ip.IsPrivate() ||
		ip.IsUnspecified() ||
		ip.IsMulticast() ||
		ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast()
}

func validGitRef(ref string) bool {
	if ref == "" || strings.HasPrefix(ref, "-") {
		return false
	}
	for _, r := range ref {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
		case r == '/' || r == '_' || r == '.' || r == '-':
		default:
			return false
		}
	}
	return true
}
