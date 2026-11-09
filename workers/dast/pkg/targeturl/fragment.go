package targeturl

import (
	"net/url"
	"sort"
	"strings"
)

func Origin(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}
	parsed.Path = ""
	parsed.RawPath = ""
	parsed.RawQuery = ""
	parsed.Fragment = ""
	parsed.RawFragment = ""
	return strings.TrimRight(parsed.String(), "/")
}

func SplitFragment(fragment string) (path string, query url.Values, hasQuery bool) {
	fragment = strings.TrimPrefix(strings.TrimSpace(fragment), "#")
	if fragment == "" {
		return "", url.Values{}, false
	}
	path, rawQuery, found := strings.Cut(fragment, "?")
	if !found {
		return fragment, url.Values{}, false
	}
	parsed, err := url.ParseQuery(rawQuery)
	if err != nil {
		parsed = url.Values{}
	}
	return path, parsed, true
}

func UsesFragmentQuery(u *url.URL) bool {
	if u == nil {
		return false
	}
	if _, _, hasQuery := SplitFragment(u.Fragment); hasQuery {
		return true
	}
	fragment := strings.TrimPrefix(strings.TrimSpace(u.Fragment), "#")
	return strings.HasPrefix(fragment, "/")
}

func LooksLikeSearchQueryRoute(raw string) bool {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return false
	}
	path := strings.ToLower(parsed.Path)
	if strings.Contains(path, "search") {
		if _, ok := parsed.Query()["q"]; ok {
			return true
		}
	}
	fragPath, fragQuery, hasQuery := SplitFragment(parsed.Fragment)
	if strings.Contains(strings.ToLower(fragPath), "search") {
		return true
	}
	if hasQuery {
		if _, ok := fragQuery["q"]; ok {
			return true
		}
	}
	return false
}

func LooksLikeHashRouter(raw string) bool {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return false
	}
	fragment := strings.TrimPrefix(strings.TrimSpace(parsed.Fragment), "#")
	return strings.HasPrefix(fragment, "/")
}

func CanonicalSinkRoute(raw string) string {
	raw = strings.TrimSpace(raw)
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return raw
	}
	if parsed.RawQuery != "" {
		parsed.RawQuery = blankQuery(parsed.Query()).Encode()
	}
	if path, query, ok := SplitFragment(parsed.Fragment); ok {
		encoded := blankQuery(query).Encode()
		if encoded == "" {
			parsed.Fragment = path
		} else {
			parsed.Fragment = path + "?" + encoded
		}
	}
	return parsed.String()
}

func blankQuery(values url.Values) url.Values {
	if len(values) == 0 {
		return values
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := url.Values{}
	for _, key := range keys {
		out.Set(key, "")
	}
	return out
}
