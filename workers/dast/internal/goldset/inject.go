package goldset

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

const (
	ChallengeLoginSQLi    = "login-sqli"
	ChallengeSearchSQLi   = "search-sqli"
	ChallengeFormSQLi     = "form-login-sqli"
	ChallengeOpenRedirect = "open-redirect"
	ChallengeJWTNone      = "jwt-none"
	ChallengePathFile     = "path-confidential"
	ChallengeCSRF         = "csrf-change-password"

	injectSessionCookie = "session=alice"
	injectJWT           = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhbGljZUBleGFtcGxlLmNvbSJ9.signaturepad"
	injectConfidential  = "This document is confidential!\nlab-secret: fixture-canary\n"
	loginFormHTML       = `<!doctype html><html><body><form method="POST" action="/login"><input name="email"><input type="password" name="password"></form><p>Invalid email or password.</p></body></html>`
	loginOkHTML         = `<!doctype html><html><body><a href="/logout">Log out</a><p>Welcome dashboard</p></body></html>`
)

func ExpectedInjectChallenges() []string {
	return []string{
		ChallengeLoginSQLi,
		ChallengeSearchSQLi,
		ChallengeFormSQLi,
		ChallengeOpenRedirect,
		ChallengeJWTNone,
		ChallengePathFile,
		ChallengeCSRF,
	}
}

func InjectHandler() http.Handler {
	return injectMux(false)
}

func PatchedInjectHandler() http.Handler {
	return injectMux(true)
}

func injectMux(secure bool) http.Handler {
	mux := http.NewServeMux()
	writeJSON := func(w http.ResponseWriter, status int, body string) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}
	looksLikeSQLi := func(value string) bool {
		lower := strings.ToLower(value)
		return strings.Contains(value, "'") || strings.Contains(lower, " or ") || strings.Contains(lower, "--")
	}

	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		email, _ := body["email"].(string)
		if !secure && looksLikeSQLi(email) {
			writeJSON(w, http.StatusOK, `{"authentication":{"token":"`+injectJWT+`","access_token":"`+injectJWT+`"}}`)
			return
		}
		writeJSON(w, http.StatusUnauthorized, `{"error":{"message":"Invalid email or password.","status":401}}`)
	})

	mux.HandleFunc("GET /search", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query().Get("q")
		if !secure && strings.Contains(q, "'") {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`<html><title>Error: SQLITE_ERROR: incomplete input</title></html>`))
			return
		}
		writeJSON(w, http.StatusOK, `{"results":[{"id":1}]}`)
	})

	mux.HandleFunc("POST /login", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		email := r.FormValue("email")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if !secure && looksLikeSQLi(email) {
			_, _ = w.Write([]byte(loginOkHTML))
			return
		}
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(loginFormHTML))
	})

	mux.HandleFunc("GET /redirect", func(w http.ResponseWriter, r *http.Request) {
		to := strings.TrimSpace(r.URL.Query().Get("to"))
		if to == "" {
			http.Redirect(w, r, "/", http.StatusFound)
			return
		}
		if secure {
			http.Redirect(w, r, "/", http.StatusFound)
			return
		}
		w.Header().Set("Location", to)
		w.WriteHeader(http.StatusFound)
	})

	mux.HandleFunc("GET /api/me", func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if secure {
			if auth != "Bearer "+injectJWT {
				writeJSON(w, http.StatusUnauthorized, `{"error":"unauthorized"}`)
				return
			}
			writeJSON(w, http.StatusOK, `{"email":"alice@example.com","role":"admin"}`)
			return
		}
		if strings.Contains(auth, "invalid-signature") || strings.TrimSpace(auth) == "" {
			writeJSON(w, http.StatusUnauthorized, `{"error":"unauthorized"}`)
			return
		}
		writeJSON(w, http.StatusOK, `{"email":"alice@example.com","role":"admin"}`)
	})

	mux.HandleFunc("GET /files/{name}", func(w http.ResponseWriter, r *http.Request) {
		name := strings.ToLower(r.PathValue("name"))
		if !secure && (strings.Contains(name, "secret") || strings.Contains(name, "acquisitions") || strings.Contains(name, "passwd")) {
			w.Header().Set("Content-Type", "text/plain")
			_, _ = w.Write([]byte(injectConfidential))
			return
		}
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte("public readme"))
	})

	mux.HandleFunc("POST /api/password", func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Cookie"), "session=alice") {
			writeJSON(w, http.StatusUnauthorized, `{"error":"unauthorized"}`)
			return
		}
		if secure {
			origin := r.Header.Get("Origin")
			if origin != "" && !strings.Contains(strings.ToLower(origin), r.Host) {
				writeJSON(w, http.StatusForbidden, `{"error":"csrf"}`)
				return
			}
		}
		writeJSON(w, http.StatusOK, `{"user":{"password":"ok"}}`)
	})

	return mux
}

func InjectJobPairs(origin string) []jobPair {
	origin = targeturl.Origin(origin)
	sqlPayload, _ := json.Marshal(map[string]any{
		"value":  "' OR 1=1 --",
		"values": []string{"' OR 1=1 --", "' or 1=1--"},
	})
	redirectPayload, _ := json.Marshal(map[string]any{
		"value": "https://evil.example/phish",
	})
	jwtPayload, _ := json.Marshal(map[string]any{
		"value": "none",
		"field": "Authorization",
	})
	ftpPayload, _ := json.Marshal(map[string]any{
		"value": "acquisitions.md",
	})
	csrfPayload, _ := json.Marshal(map[string]any{
		"value": "https://evil.example",
		"field": "Origin",
	})

	login := contracts.NewAttackVector(origin+"/api/login", http.MethodPost, "JSON_BODY")
	login.Params["email"] = ""
	login.Params["password"] = "x"
	login.Body = `{"email":"","password":"x"}`

	search := contracts.NewAttackVector(origin+"/search?q=", http.MethodGet, "QUERY_PARAMETER")
	search.Params["q"] = ""

	form := contracts.NewAttackVector(origin+"/login", http.MethodPost, "FORM")
	form.Params["email"] = "user@example.com"
	form.Params["password"] = "x"

	redirect := contracts.NewAttackVector(origin+"/redirect?to=", http.MethodGet, "QUERY_PARAMETER")
	redirect.Params["to"] = ""

	me := contracts.NewAttackVector(origin+"/api/me", http.MethodGet, "HEADER")
	me.Headers["Authorization"] = "Bearer " + injectJWT

	files := contracts.NewAttackVector(origin+"/files/readme.txt", http.MethodGet, "URL_PATH")

	csrf := contracts.NewAttackVector(origin+"/api/password", http.MethodPost, "HEADER")
	csrf.Headers["Cookie"] = injectSessionCookie

	return []jobPair{
		{
			vectors: []contracts.AttackVector{login},
			catalog: []contracts.AttackItem{{AttackID: "gold-sql-json", Category: "SQL_INJECTION", TargetLocation: "JSON_BODY", RiskLevel: "HIGH", Payload: sqlPayload}},
		},
		{
			vectors: []contracts.AttackVector{search},
			catalog: []contracts.AttackItem{{AttackID: "gold-sql-query", Category: "SQL_INJECTION", TargetLocation: "QUERY_PARAMETER", RiskLevel: "HIGH", Payload: sqlPayload}},
		},
		{
			vectors: []contracts.AttackVector{form},
			catalog: []contracts.AttackItem{{AttackID: "gold-sql-form", Category: "SQL_INJECTION", TargetLocation: "FORM", RiskLevel: "HIGH", Payload: sqlPayload}},
		},
		{
			vectors: []contracts.AttackVector{redirect},
			catalog: []contracts.AttackItem{{AttackID: "gold-redirect", Category: "OPEN_REDIRECT", TargetLocation: "QUERY_PARAMETER", RiskLevel: "MEDIUM", Payload: redirectPayload}},
		},
		{
			vectors: []contracts.AttackVector{me},
			catalog: []contracts.AttackItem{{AttackID: "gold-jwt", Category: "JWT_CONFUSION", TargetLocation: "HEADER", RiskLevel: "HIGH", Payload: jwtPayload}},
		},
		{
			vectors: []contracts.AttackVector{files},
			catalog: []contracts.AttackItem{{AttackID: "gold-path", Category: "PATH_TRAVERSAL", TargetLocation: "URL_PATH", RiskLevel: "HIGH", Payload: ftpPayload}},
		},
		{
			vectors: []contracts.AttackVector{csrf},
			catalog: []contracts.AttackItem{{AttackID: "gold-csrf", Category: "CSRF", TargetLocation: "HEADER", RiskLevel: "MEDIUM", Payload: csrfPayload}},
		},
	}
}

func ClassifyInject(route, category string) string {
	upper := strings.ToUpper(category)
	lower := strings.ToLower(route)
	switch {
	case strings.Contains(upper, "SQL") && strings.Contains(lower, "/api/login"):
		return ChallengeLoginSQLi
	case strings.Contains(upper, "SQL") && strings.Contains(lower, "/search"):
		return ChallengeSearchSQLi
	case strings.Contains(upper, "SQL") && strings.Contains(lower, "/login"):
		return ChallengeFormSQLi
	case strings.Contains(upper, "REDIRECT"):
		return ChallengeOpenRedirect
	case strings.Contains(upper, "JWT"):
		return ChallengeJWTNone
	case strings.Contains(upper, "PATH") && strings.Contains(lower, "/files"):
		return ChallengePathFile
	case strings.Contains(upper, "CSRF"):
		return ChallengeCSRF
	default:
		return ""
	}
}
