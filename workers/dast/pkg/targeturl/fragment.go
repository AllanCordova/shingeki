package targeturl

import (
	"net/url"
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

func HashSearchURL(targetURL string) string {
	origin := Origin(targetURL)
	if origin == "" {
		return ""
	}
	return origin + "/#/search?q="
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

func LooksLikeRestAPI(raw string) bool {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return false
	}
	path := strings.ToLower(parsed.Path)
	return strings.Contains(path, "/rest/") || strings.HasPrefix(path, "/rest")
}

func JSONLoginURL(targetURL string) string {
	origin := Origin(targetURL)
	if origin == "" {
		return ""
	}
	return origin + "/rest/user/login"
}

func CredentialJSONLoginURL(targetURL, loginURL string) string {
	origin := Origin(targetURL)
	if origin == "" {
		origin = Origin(loginURL)
	}
	if origin == "" {
		return ""
	}
	loginURL = strings.TrimSpace(loginURL)
	if loginURL == "" {
		return origin + "/rest/user/login"
	}
	resolved := ResolveAgainstOrigin(origin, loginURL)
	if LooksLikeHTMLFormLogin(resolved) {
		return ""
	}
	if LooksLikeJSONLoginPath(resolved) {
		return StripFragment(resolved)
	}
	return origin + "/rest/user/login"
}

func HTMLFormLoginURL(targetURL, loginURL string) string {
	origin := Origin(targetURL)
	if origin == "" {
		origin = Origin(loginURL)
	}
	if origin == "" {
		return ""
	}
	resolved := ResolveAgainstOrigin(origin, strings.TrimSpace(loginURL))
	if !LooksLikeHTMLFormLogin(resolved) {
		return ""
	}
	return StripFragment(resolved)
}

func ResolveAgainstOrigin(origin, ref string) string {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return ""
	}
	parsed, err := url.Parse(ref)
	if err != nil {
		return ""
	}
	if parsed.IsAbs() {
		return parsed.String()
	}
	base, err := url.Parse(strings.TrimRight(strings.TrimSpace(origin), "/") + "/")
	if err != nil {
		return ""
	}
	return base.ResolveReference(parsed).String()
}

func StripFragment(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return strings.TrimSpace(raw)
	}
	parsed.Fragment = ""
	parsed.RawFragment = ""
	return parsed.String()
}

func LooksLikeHTMLFormLogin(raw string) bool {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return false
	}
	path := strings.ToLower(parsed.Path)
	for _, ext := range []string{".php", ".asp", ".aspx", ".jsp", ".html", ".htm", ".cfm"} {
		if strings.HasSuffix(path, ext) {
			return true
		}
	}
	return false
}

func LooksLikeJSONLoginPath(raw string) bool {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return false
	}
	if strings.TrimSpace(parsed.Fragment) != "" {
		return false
	}
	path := strings.ToLower(parsed.Path)
	if LooksLikeHTMLFormLogin(raw) {
		return false
	}
	hasLogin := strings.Contains(path, "login") || strings.Contains(path, "signin") || strings.Contains(path, "session") || strings.Contains(path, "token")
	hasAPI := strings.Contains(path, "/rest/") || strings.HasPrefix(path, "/rest") || strings.Contains(path, "/api/") || strings.Contains(path, "/auth/")
	return hasLogin && hasAPI
}
