package targeturl

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

func Normalize(raw string) string {
	rewriteHost := strings.TrimSpace(os.Getenv("TARGET_LOCALHOST_REWRITE"))
	if rewriteHost == "" {
		return raw
	}

	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return raw
	}

	host := strings.ToLower(parsed.Hostname())
	if host != "localhost" && host != "127.0.0.1" {
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
	return nil
}
