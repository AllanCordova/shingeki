package targeturl

import (
	"net/url"
	"os"
	"strings"
)

// Normalize rewrites localhost targets so a worker running in Docker can reach
// apps served on the developer machine (e.g. Next.js on localhost:3000).
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
