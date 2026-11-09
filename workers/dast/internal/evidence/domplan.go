package evidence

import (
	"net/url"
	"regexp"
	"strings"
)

type domSourcePlan struct {
	Kind       string
	CookieName string
	StorageKey string
}

var (
	cookieLookupPattern = regexp.MustCompile(`(?i)lookupCookie\(\s*['"]([^'"]+)['"]\s*\)`)
	storageGetPattern   = regexp.MustCompile(`(?i)(?:localStorage|sessionStorage)\.getItem\(\s*['"]([^'"]+)['"]\s*\)`)
	storageIndexPattern = regexp.MustCompile(`(?i)(?:localStorage|sessionStorage)\[['"]([^'"]+)['"]\]`)
	storageDotPattern   = regexp.MustCompile(`(?i)(?:localStorage|sessionStorage)\.([A-Za-z_][\w]*)`)
)

func planDOMSource(body string) domSourcePlan {
	lower := strings.ToLower(body)
	if name := firstMatch(cookieLookupPattern, body); name != "" {
		return domSourcePlan{Kind: "cookie", CookieName: name}
	}
	if strings.Contains(lower, "window.name") {
		return domSourcePlan{Kind: "name"}
	}
	if strings.Contains(lower, "localstorage") || strings.Contains(lower, "sessionstorage") {
		return domSourcePlan{Kind: "storage", StorageKey: storageKey(body)}
	}
	if strings.Contains(lower, "document.referrer") {
		return domSourcePlan{Kind: "referrer"}
	}
	if strings.Contains(lower, "postmessage") || strings.Contains(lower, "onmessage") {
		return domSourcePlan{Kind: "postmessage"}
	}
	if strings.Contains(lower, "keyup") || strings.Contains(lower, "onsubmit") || strings.Contains(lower, "'submit'") || strings.Contains(lower, "\"submit\"") {
		return domSourcePlan{Kind: "event"}
	}
	if strings.Contains(lower, "location.hash") ||
		strings.Contains(lower, "location.href") ||
		strings.Contains(lower, "location.search") ||
		strings.Contains(lower, "document.url") ||
		strings.Contains(lower, "documenturi") ||
		strings.Contains(lower, "document.baseuri") ||
		strings.Contains(lower, "location.pathname") {
		return domSourcePlan{Kind: "url"}
	}
	return domSourcePlan{}
}

func storageKey(body string) string {
	for _, pattern := range []*regexp.Regexp{storageGetPattern, storageIndexPattern, storageDotPattern} {
		for _, match := range pattern.FindAllStringSubmatch(body, -1) {
			key := match[1]
			switch strings.ToLower(key) {
			case "length", "key", "getitem", "setitem", "removeitem", "clear":
				continue
			default:
				if key != "" {
					return key
				}
			}
		}
	}
	return "badValue"
}

func firstMatch(pattern *regexp.Regexp, body string) string {
	match := pattern.FindStringSubmatch(body)
	if len(match) < 2 {
		return ""
	}
	return match[1]
}

func withDOMPayload(pageURL, payload string) string {
	parsed, err := url.Parse(strings.TrimSpace(pageURL))
	if err != nil || payload == "" {
		return pageURL
	}
	query := parsed.Query()
	query.Set("xss", payload)
	parsed.RawQuery = query.Encode()
	parsed.Fragment = payload
	return parsed.String()
}
