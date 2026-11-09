package static

import (
	"net/url"
	"regexp"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

var xmlScriptSrc = regexp.MustCompile(`(?i)<script[^>]+src=["'][^"']*xml[^"']*\.js`)

var xmlScriptSrcAttr = regexp.MustCompile(`(?i)<script[^>]+src=["']([^"']*xml[^"']*\.js)["']`)

var quotedQueryURL = regexp.MustCompile(`(?:"|')((?:https?:\/\/[^"'\\\s]+|\/[^"'\\\s]*)\?[^"'\\\s]*)(?:"|')`)

var clientQueryRead = regexp.MustCompile(`(?i)URLSearchParams\([^)]*\)\.get\(\s*["']([A-Za-z_][\w.-]{0,40})["']\s*\)`)

var xmlRootLiteral = regexp.MustCompile(`['"]<([A-Za-z_][\w:-]*)>['"]`)

func queryVectorFromHref(pageURL, href string) (contracts.AttackVector, bool) {
	href = strings.TrimSpace(href)
	if href == "" || strings.HasPrefix(href, "#") || strings.HasPrefix(strings.ToLower(href), "javascript:") {
		return contracts.AttackVector{}, false
	}
	resolved, ok := bfs.ResolveReference(pageURL, href)
	if !ok || !bfs.IsAttackableDiscoveryURL(pageURL, resolved) {
		return contracts.AttackVector{}, false
	}
	parsed, err := url.Parse(resolved)
	if err != nil || parsed.RawQuery == "" {
		return contracts.AttackVector{}, false
	}
	vector := contracts.NewAttackVector(resolved, "GET", "QUERY_PARAMETER")
	for key, values := range parsed.Query() {
		if len(values) == 0 {
			continue
		}
		vector.Params[key] = values[0]
	}
	if len(vector.Params) == 0 {
		return contracts.AttackVector{}, false
	}
	return vector, true
}

// pathVectorFromHref records a same-origin page that has no query string.
// Section indexes list those cases as plain links, and the crawl budget often
// ends before every case page is visited.
func pathVectorFromHref(pageURL, href string) (contracts.AttackVector, bool) {
	href = strings.TrimSpace(href)
	if href == "" || strings.HasPrefix(href, "#") || strings.HasPrefix(strings.ToLower(href), "javascript:") {
		return contracts.AttackVector{}, false
	}
	resolved, ok := bfs.ResolveReference(pageURL, href)
	if !ok || !bfs.IsAttackableDiscoveryURL(pageURL, resolved) || bfs.IsSkippableAsset(resolved) {
		return contracts.AttackVector{}, false
	}
	parsed, err := url.Parse(resolved)
	if err != nil || parsed.RawQuery != "" {
		return contracts.AttackVector{}, false
	}
	parsed.Fragment = ""
	parsed.RawFragment = ""
	if parsed.Path == "" || parsed.Path == "/" {
		return contracts.AttackVector{}, false
	}
	return contracts.NewAttackVector(parsed.String(), "GET", "URL_PATH"), true
}

func pageLooksLikeSPAShell(html string, sameOriginLinks int) bool {
	if sameOriginLinks > 2 {
		return false
	}
	lower := strings.ToLower(html)
	return strings.Contains(lower, "<app-root") || strings.Contains(lower, "ng-version")
}

func spaShellVector(pageURL string) (contracts.AttackVector, bool) {
	origin := targeturl.Origin(pageURL)
	if origin == "" {
		return contracts.AttackVector{}, false
	}
	return contracts.NewAttackVector(origin+"/#/", "GET", "URL_PATH"), true
}

func pageOffersXML(html string) bool {
	lower := strings.ToLower(html)
	if strings.Contains(lower, "text/xml") || strings.Contains(lower, "application/xml") || strings.Contains(lower, "<?xml") {
		return true
	}
	return xmlScriptSrc.MatchString(html)
}

// augmentStaticPage adds query vectors that exist only as script strings or as
// parameters a client script reads from the address bar.
func augmentStaticPage(pageURL, html string, vectors []contracts.AttackVector) []contracts.AttackVector {
	vectors = append(vectors, scriptQueryVectors(pageURL, html)...)
	return attachClientQueryParams(pageURL, html, vectors)
}

func scriptQueryVectors(pageURL, html string) []contracts.AttackVector {
	if strings.TrimSpace(html) == "" {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]contracts.AttackVector, 0)
	for _, match := range quotedQueryURL.FindAllStringSubmatch(html, -1) {
		href := match[1]
		if _, ok := seen[href]; ok {
			continue
		}
		seen[href] = struct{}{}
		vector, ok := queryVectorFromHref(pageURL, href)
		if !ok {
			continue
		}
		out = append(out, vector)
	}
	return out
}

func attachClientQueryParams(pageURL, html string, vectors []contracts.AttackVector) []contracts.AttackVector {
	names := clientQueryRead.FindAllStringSubmatch(html, -1)
	if len(names) == 0 {
		return vectors
	}
	parsed, err := url.Parse(pageURL)
	if err != nil {
		return vectors
	}
	values := parsed.Query()
	added := false
	for _, match := range names {
		name := match[1]
		if _, exists := values[name]; exists {
			continue
		}
		values.Set(name, "")
		added = true
	}
	if !added {
		return vectors
	}
	parsed.RawQuery = values.Encode()
	vector, ok := queryVectorFromHref(pageURL, parsed.String())
	if !ok {
		return vectors
	}
	return append(vectors, vector)
}

func xmlRootFromSource(source string) string {
	for _, match := range xmlRootLiteral.FindAllStringSubmatch(source, -1) {
		name := match[1]
		if name == "" {
			continue
		}
		if strings.Contains(source, "</"+name+">") {
			return name
		}
	}
	return ""
}

func xmlScriptURL(pageURL, html string) string {
	match := xmlScriptSrcAttr.FindStringSubmatch(html)
	if len(match) != 2 {
		return ""
	}
	resolved, ok := bfs.ResolveReference(pageURL, strings.TrimSpace(match[1]))
	if !ok {
		return ""
	}
	return resolved
}

func xmlProbeFromForm(vector contracts.AttackVector) (contracts.AttackVector, bool) {
	if !strings.EqualFold(vector.Method, "POST") || vector.TargetLocation != "FORM" {
		return contracts.AttackVector{}, false
	}
	next := vector
	next.TargetLocation = "XML_BODY"
	if vector.Params != nil {
		next.Params = make(map[string]string, len(vector.Params))
		for key, value := range vector.Params {
			next.Params[key] = value
		}
	}
	return next, true
}
