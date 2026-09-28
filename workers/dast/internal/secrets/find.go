package secrets

import (
	"regexp"
	"strings"
)

type Match struct {
	Kind  string
	Value string
}

type pattern struct {
	kind    string
	matcher *regexp.Regexp
}

var patterns = []pattern{
	{kind: "stripe_sk_live", matcher: regexp.MustCompile(`sk_live_[0-9A-Za-z_]{16,}`)},
	{kind: "stripe_sk_test", matcher: regexp.MustCompile(`sk_test_[0-9A-Za-z_]{16,}`)},
	{kind: "github_pat", matcher: regexp.MustCompile(`ghp_[0-9A-Za-z]{20,}`)},
	{kind: "github_fine_grained", matcher: regexp.MustCompile(`github_pat_[0-9A-Za-z_]{20,}`)},
	{kind: "aws_access_key", matcher: regexp.MustCompile(`AKIA[0-9A-Z]{16}`)},
	{kind: "slack_token", matcher: regexp.MustCompile(`xox[baprs]-[0-9A-Za-z-]{10,}`)},
	{kind: "google_api_key", matcher: regexp.MustCompile(`AIza[0-9A-Za-z_-]{35}`)},
	{kind: "openai_key", matcher: regexp.MustCompile(`\bsk-[A-Za-z0-9]{20,}\b`)},
	{kind: "jwt", matcher: regexp.MustCompile(`eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}`)},
}

func Find(text string) []Match {
	if strings.TrimSpace(text) == "" {
		return nil
	}
	seen := map[string]struct{}{}
	var out []Match
	for _, item := range patterns {
		for _, value := range item.matcher.FindAllString(text, 8) {
			key := item.kind + "\x00" + value
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			out = append(out, Match{Kind: item.kind, Value: value})
		}
	}
	return out
}

func TruncateValue(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 40 {
		return value
	}
	return value[:40] + "…"
}
