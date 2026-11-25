package goldset

import (
	"io"
	"net/http"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
)

const (
	labJuiceLoginSQLi  = "juice-login-sqli"
	labJuiceRedirect   = "juice-open-redirect"
	labFiringXSS       = "firing-reflected-xss"
	labFiringRedirect  = "firing-open-redirect"
	labAcunetixSQLi    = "acunetix-sqli"
	labAcunetixXSS     = "acunetix-xss"
	labGinSQLi         = "gin-catalog-sqli"
	labGinXSS          = "gin-catalog-xss"
	labGinRedirect     = "gin-open-redirect"
	labGinXXE          = "gin-xxe"
	labSQLPayload      = "' OR 1=1 --"
	labXSSPayload      = `<img src=x onerror=alert(1)>`
	labRedirectPayload = "https://evil.invalid/phish"
	labXXEPayload      = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>`
	labPasswdMarker    = "root:x:0:0:root:/root:/bin/bash"
)

func ExpectedLabChallenges() []string {
	return []string{
		labJuiceLoginSQLi,
		labJuiceRedirect,
		labFiringXSS,
		labFiringRedirect,
		labAcunetixSQLi,
		labAcunetixXSS,
		labGinSQLi,
		labGinXSS,
		labGinRedirect,
		labGinXXE,
	}
}

// LabsHandler stands in for the public routes already listed for the four
// scanner targets. Each route answers the one class marked public for that lab.
func LabsHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /rest/user/login", labJSONLogin)
	mux.HandleFunc("GET /redirect", labRedirect("to"))
	mux.HandleFunc("GET /reflected/parameter/body", labReflect("q"))
	mux.HandleFunc("GET /redirect/parameter", labRedirect("url"))
	mux.HandleFunc("GET /ReadNews.aspx", labSQLError("id"))
	mux.HandleFunc("GET /Comments.aspx", labReflect("id"))
	mux.HandleFunc("GET /catalog", labCatalog)
	mux.HandleFunc("GET /blog/post", labRedirect("back"))
	mux.HandleFunc("POST /catalog/product/stock", labXXE)
	return mux
}

func LabJobs(origin string) []types.Job {
	origin = strings.TrimRight(origin, "/")
	return []types.Job{
		labJob(origin, http.MethodPost, "/rest/user/login", "JSON_BODY", "email", "SQL_INJECTION", labSQLPayload, map[string]string{
			"email":    "user@example.com",
			"password": "password",
		}),
		labJob(origin, http.MethodGet, "/redirect?to=/home", "QUERY_PARAMETER", "to", "OPEN_REDIRECT", labRedirectPayload, map[string]string{
			"to": "/home",
		}),
		labJob(origin, http.MethodGet, "/reflected/parameter/body?q=a", "QUERY_PARAMETER", "q", "XSS", labXSSPayload, map[string]string{
			"q": "a",
		}),
		labJob(origin, http.MethodGet, "/redirect/parameter?url=/", "QUERY_PARAMETER", "url", "OPEN_REDIRECT", labRedirectPayload, map[string]string{
			"url": "/",
		}),
		labJob(origin, http.MethodGet, "/ReadNews.aspx?id=1", "QUERY_PARAMETER", "id", "SQL_INJECTION", labSQLPayload, map[string]string{
			"id": "1",
		}),
		labJob(origin, http.MethodGet, "/Comments.aspx?id=1", "QUERY_PARAMETER", "id", "XSS", labXSSPayload, map[string]string{
			"id": "1",
		}),
		labJob(origin, http.MethodGet, "/catalog?searchTerm=gin", "QUERY_PARAMETER", "searchTerm", "SQL_INJECTION", labSQLPayload, map[string]string{
			"searchTerm": "gin",
		}),
		labJob(origin, http.MethodGet, "/catalog?searchTerm=gin", "QUERY_PARAMETER", "searchTerm", "XSS", labXSSPayload, map[string]string{
			"searchTerm": "gin",
		}),
		labJob(origin, http.MethodGet, "/blog/post?postId=1&back=/blog", "QUERY_PARAMETER", "back", "OPEN_REDIRECT", labRedirectPayload, map[string]string{
			"postId": "1",
			"back":   "/blog",
		}),
		labXMLJob(origin),
	}
}

func ClassifyLab(route, category string) string {
	path := labPath(route)
	category = strings.ToUpper(category)
	switch {
	case path == "/rest/user/login" && category == "SQL_INJECTION":
		return labJuiceLoginSQLi
	case path == "/redirect" && category == "OPEN_REDIRECT":
		return labJuiceRedirect
	case path == "/reflected/parameter/body" && category == "XSS":
		return labFiringXSS
	case path == "/redirect/parameter" && category == "OPEN_REDIRECT":
		return labFiringRedirect
	case path == "/readnews.aspx" && category == "SQL_INJECTION":
		return labAcunetixSQLi
	case path == "/comments.aspx" && category == "XSS":
		return labAcunetixXSS
	case path == "/catalog" && category == "SQL_INJECTION":
		return labGinSQLi
	case path == "/catalog" && category == "XSS":
		return labGinXSS
	case path == "/blog/post" && category == "OPEN_REDIRECT":
		return labGinRedirect
	case path == "/catalog/product/stock" && category == "XXE":
		return labGinXXE
	default:
		return ""
	}
}

func labJob(origin, method, route, location, param, category, payload string, params map[string]string) types.Job {
	vector := contracts.NewAttackVector(origin+route, method, location)
	for key, value := range params {
		vector.Params[key] = value
	}
	return types.Job{
		Attack: contracts.AttackItem{
			AttackID:       category + ":" + route,
			Category:       category,
			TargetLocation: location,
		},
		Vector:   vector,
		ParamKey: param,
		Payload:  types.PayloadSpec{Value: payload, Field: param},
	}
}

func labXMLJob(origin string) types.Job {
	vector := contracts.NewAttackVector(origin+"/catalog/product/stock", http.MethodPost, "XML_BODY")
	vector.XMLRoot = "stockCheck"
	vector.Params["productId"] = "1"
	return types.Job{
		Attack: contracts.AttackItem{
			AttackID:       "XXE:/catalog/product/stock",
			Category:       "XXE",
			TargetLocation: "XML_BODY",
		},
		Vector:   vector,
		ParamKey: "productId",
		Payload:  types.PayloadSpec{Value: labXXEPayload, Field: "productId"},
	}
}

func labPath(route string) string {
	raw := route
	if i := strings.Index(raw, "://"); i >= 0 {
		raw = raw[i+3:]
		if slash := strings.Index(raw, "/"); slash >= 0 {
			raw = raw[slash:]
		}
	}
	if i := strings.IndexAny(raw, "?#"); i >= 0 {
		raw = raw[:i]
	}
	return strings.ToLower(raw)
}

func labJSONLogin(w http.ResponseWriter, r *http.Request) {
	body := readBody(r)
	w.Header().Set("Content-Type", "application/json")
	if strings.Contains(body, "'") {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"authentication":{"token":"` + injectJWT + `"}}`))
		return
	}
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":"invalid"}`))
}

func labRedirect(param string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		target := strings.TrimSpace(r.URL.Query().Get(param))
		if strings.Contains(target, "://") {
			http.Redirect(w, r, target, http.StatusFound)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<!doctype html><html><body>stay</body></html>`))
	}
}

func labReflect(param string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		value := r.URL.Query().Get(param)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if strings.Contains(value, "<") {
			_, _ = w.Write([]byte(`<!doctype html><html><body>` + value + `</body></html>`))
			return
		}
		_, _ = w.Write([]byte(`<!doctype html><html><body>ok</body></html>`))
	}
}

func labSQLError(param string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		value := r.URL.Query().Get(param)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if strings.Contains(value, "'") {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`<html><title>SQLITE_ERROR: incomplete input</title></html>`))
			return
		}
		_, _ = w.Write([]byte(`<!doctype html><html><body>news</body></html>`))
	}
}

func labCatalog(w http.ResponseWriter, r *http.Request) {
	value := r.URL.Query().Get("searchTerm")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	switch {
	case strings.Contains(value, "'"):
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`<html><title>SQLITE_ERROR: incomplete input</title></html>`))
	case strings.Contains(value, "<"):
		_, _ = w.Write([]byte(`<!doctype html><html><body>` + value + `</body></html>`))
	default:
		_, _ = w.Write([]byte(`<!doctype html><html><body>gin</body></html>`))
	}
}

func labXXE(w http.ResponseWriter, r *http.Request) {
	body := readBody(r)
	w.Header().Set("Content-Type", "text/xml")
	if strings.Contains(strings.ToLower(body), "<!entity") && strings.Contains(body, "file:") {
		_, _ = w.Write([]byte(`<stock>` + labPasswdMarker + `</stock>`))
		return
	}
	_, _ = w.Write([]byte(`<stock>1</stock>`))
}

func readBody(r *http.Request) string {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<16))
	if err != nil {
		return ""
	}
	return string(body)
}
