package targeturl

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"strings"
)

func Normalize(raw string) string {
	rewriteHost := strings.TrimSpace(os.Getenv("TARGET_LOCALHOST_REWRITE"))
	if rewriteHost == "" {
		return raw
	}
	if !validRewriteHost(rewriteHost) {
		return raw
	}

	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return raw
	}

	host := strings.ToLower(parsed.Hostname())
	if !isLoopbackHost(host) {
		return raw
	}

	port := parsed.Port()
	if port != "" {
		parsed.Host = rewriteHost + ":" + port
	} else {
		parsed.Host = rewriteHost
	}

	return parsed.String()
}

func AssertHTTP(raw string) error {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return fmt.Errorf("invalid target url")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("target url scheme must be http or https")
	}
	if parsed.Host == "" {
		return fmt.Errorf("target url host is required")
	}
	if parsed.User != nil {
		return fmt.Errorf("target url must not include credentials")
	}
	if IsDisallowedHost(parsed.Hostname()) {
		return fmt.Errorf("target url host is not allowed")
	}
	return nil
}

func IsDisallowedHost(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	host = strings.Trim(host, "[]")
	if host == "" {
		return false
	}
	if host == "metadata.google.internal" || strings.HasSuffix(host, ".metadata.google.internal") {
		return true
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}
	return ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast()
}

func isLoopbackHost(host string) bool {
	switch host {
	case "localhost", "127.0.0.1", "::1":
		return true
	default:
		return false
	}
}

func validRewriteHost(host string) bool {
	if host == "" || strings.ContainsAny(host, "/:\\") || strings.Contains(host, "://") {
		return false
	}
	if net.ParseIP(host) != nil {
		return true
	}
	return !strings.Contains(host, " ")
}
