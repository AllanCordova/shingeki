package goldset

import (
	"net/http"
	"strings"
)

const (
	ChallengeStripeLeak = "stripe-sk-live-json"
	ChallengeGitHubLeak = "github-pat-js"
	ChallengeReactXSS   = "react-preview-xss"

	CanaryStripe = "sk_live_shingeki_canary_react_do_not_use"
	CanaryGitHub = "ghp_shingekiCanaryReact0000000000000000"
)

func ExpectedReactLeakChallenges() []string {
	return []string{ChallengeStripeLeak, ChallengeGitHubLeak, ChallengeReactXSS}
}

func ReactLeakHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/config", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"stripe_secret":"` + CanaryStripe + `"}`))
	})
	mux.HandleFunc("/_next/static/chunks/app.js", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/javascript")
		_, _ = w.Write([]byte(`export const GITHUB_PAT_CANARY = "` + CanaryGitHub + `";`))
	})
	mux.HandleFunc("/preview", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query().Get("q")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		body := `<html><body>`
		body += `<form method="GET" action="/preview"><input name="q" value="` + htmlAttr(q) + `"></form>`
		body += `<div>Resultados para: ` + q + `</div>`
		body += `<script src="/_next/static/chunks/app.js"></script>`
		body += `</body></html>`
		_, _ = w.Write([]byte(body))
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<html><body><a href="/preview">preview</a></body></html>`))
	})
	return mux
}

func htmlAttr(value string) string {
	replacer := strings.NewReplacer(`&`, "&amp;", `"`, "&quot;", `<`, "&lt;", `>`, "&gt;")
	return replacer.Replace(value)
}

func ClassifyReactLeak(route, kindOrCategory string) string {
	route = strings.ToLower(route)
	kind := strings.ToLower(strings.TrimSpace(kindOrCategory))
	switch {
	case kind == "stripe_sk_live" || (strings.Contains(route, "/api/config") && strings.Contains(kind, "stripe")):
		return ChallengeStripeLeak
	case kind == "github_pat" || (strings.Contains(route, "/_next/static/") && strings.Contains(kind, "github")):
		return ChallengeGitHubLeak
	case strings.Contains(kind, "xss") && strings.Contains(route, "/preview"):
		return ChallengeReactXSS
	default:
		return ""
	}
}
