package evidence

import (
	"net/url"
	"regexp"
	"strings"

	"golang.org/x/net/html"
)

var scriptInnerPattern = regexp.MustCompile(`(?is)<script[^>]*>(.*?)</script>`)

func jsonXSSAllowed(contentType string) bool {
	media := mediaType(contentType)
	if media == "" {
		return true
	}
	return strings.Contains(media, "text/html") || strings.Contains(media, "xhtml")
}

func executableHTMLXSS(baseline, attack, payload, contentType string) bool {
	payload = strings.TrimSpace(payload)
	if payload == "" || blockedXSSContentType(contentType) || !looksLikeHTML(attack) {
		return false
	}
	before := htmlSinks(baseline, payload)
	after := htmlSinks(attack, payload)
	for sink := range after {
		if _, exists := before[sink]; !exists {
			return true
		}
	}
	return false
}

func blockedXSSContentType(contentType string) bool {
	media := mediaType(contentType)
	if media == "" {
		return false
	}
	switch {
	case strings.Contains(media, "text/html"), strings.Contains(media, "xhtml"):
		return false
	case strings.Contains(media, "json"),
		strings.Contains(media, "text/plain"),
		strings.Contains(media, "javascript"),
		strings.Contains(media, "ecmascript"),
		strings.Contains(media, "text/css"),
		strings.Contains(media, "image/"),
		strings.Contains(media, "font/"),
		strings.Contains(media, "octet-stream"),
		strings.Contains(media, "application/pdf"),
		strings.Contains(media, "text/xml"),
		strings.Contains(media, "application/xml"):
		return true
	default:
		return false
	}
}

func mediaType(contentType string) string {
	media := strings.ToLower(strings.TrimSpace(contentType))
	if i := strings.Index(media, ";"); i >= 0 {
		media = strings.TrimSpace(media[:i])
	}
	return media
}

func htmlSinks(body, payload string) map[string]struct{} {
	out := map[string]struct{}{}
	if strings.TrimSpace(body) == "" || strings.TrimSpace(payload) == "" {
		return out
	}
	doc, err := html.Parse(strings.NewReader(body))
	if err != nil {
		return out
	}
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			for _, sink := range elementSinks(n, payload) {
				out[sink] = struct{}{}
			}
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(doc)
	return out
}

func elementSinks(n *html.Node, payload string) []string {
	var sinks []string
	tag := strings.ToLower(n.Data)
	if tag == "script" && strings.TrimSpace(attr(n, "src")) == "" && scriptTextIsPayload(nodeText(n), payload) {
		sinks = append(sinks, "script:"+strings.TrimSpace(nodeText(n)))
	}
	for _, attribute := range n.Attr {
		name := strings.ToLower(attribute.Key)
		value := strings.TrimSpace(attribute.Val)
		if strings.HasPrefix(name, "on") && eventFromPayload(value, payload) {
			sinks = append(sinks, "event:"+name+"="+value)
		}
		if urlAttribute(name) && javascriptURL(value) && strings.Contains(strings.ToLower(payload), "javascript:") {
			sinks = append(sinks, "jsurl:"+tag+"."+name+"="+strings.ToLower(value))
		}
		if tag == "script" && name == "src" && attackerResourceURL(value, payload) {
			sinks = append(sinks, "scriptsrc:"+value)
		}
		if name == "srcdoc" && strings.Contains(value, payload) && strings.Contains(strings.ToLower(payload), "<script") {
			sinks = append(sinks, "srcdoc:"+value)
		}
	}
	return sinks
}

func scriptTextIsPayload(text, payload string) bool {
	text = strings.TrimSpace(text)
	if text == "" {
		return false
	}
	for _, match := range scriptInnerPattern.FindAllStringSubmatch(payload, -1) {
		inner := strings.TrimSpace(match[1])
		if inner != "" && text == inner {
			return true
		}
	}
	return false
}

func eventFromPayload(value, payload string) bool {
	value = strings.TrimSpace(value)
	if len(value) < 5 || !strings.Contains(strings.ToLower(value), "alert") {
		return false
	}
	return strings.Contains(payload, value) || strings.Contains(value, payload)
}

func urlAttribute(name string) bool {
	switch name {
	case "href", "src", "action", "formaction", "data", "poster":
		return true
	default:
		return false
	}
}

func javascriptURL(value string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(value)), "javascript:")
}

func attackerResourceURL(value, payload string) bool {
	value = strings.TrimSpace(value)
	if value == "" || !strings.Contains(payload, value) {
		return false
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}

func attr(n *html.Node, name string) string {
	for _, attribute := range n.Attr {
		if strings.EqualFold(attribute.Key, name) {
			return attribute.Val
		}
	}
	return ""
}

func nodeText(n *html.Node) string {
	var b strings.Builder
	var walk func(*html.Node)
	walk = func(node *html.Node) {
		if node.Type == html.TextNode {
			b.WriteString(node.Data)
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(n)
	return b.String()
}
