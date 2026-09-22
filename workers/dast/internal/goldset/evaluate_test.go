package goldset

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestClassify(t *testing.T) {
	if Classify("http://shop/rest/user/login", "SQL_INJECTION") != ChallengeLoginSQLi {
		t.Fatal("login")
	}
	if Classify("http://shop/rest/products/search?q=", "SQL_INJECTION") != ChallengeSearchSQLi {
		t.Fatal("search")
	}
	if Classify("http://shop/#/search?q=", "XSS") != ChallengeDOMXSS {
		t.Fatal("xss")
	}
	if Classify("http://shop/rest/basket/1", "IDOR") != ChallengeBasketIDOR {
		t.Fatal("basket")
	}
	if Classify("http://shop/api/Users/", "IDOR") != ChallengeAdminUsers {
		t.Fatal("admin")
	}
	if Classify("http://shop/rest/products/1/reviews", "IDOR") != ChallengeReviewIDOR {
		t.Fatal("reviews")
	}
	if Classify("http://shop/redirect?to=", "OPEN_REDIRECT") != ChallengeOpenRedirect {
		t.Fatal("redirect")
	}
	if Classify("http://shop/api/Users/", "JWT_CONFUSION") != ChallengeJWTNone {
		t.Fatal("jwt")
	}
	if Classify("http://shop/ftp/", "PATH_TRAVERSAL") != ChallengeFTPFile {
		t.Fatal("ftp")
	}
	if Classify("http://shop/rest/user/change-password", "CSRF") != ChallengeCSRF {
		t.Fatal("csrf")
	}
	if Classify("http://shop/rest/languages", "SQL_INJECTION") != "" {
		t.Fatal("unknown must be empty")
	}
}

func TestVectorsAndCatalog(t *testing.T) {
	vectors := Vectors("http://127.0.0.1:3001/")
	if len(vectors) != 3 {
		t.Fatalf("vectors=%d", len(vectors))
	}
	if len(Catalog()) != 3 {
		t.Fatalf("catalog=%d", len(Catalog()))
	}
	auth := AuthVectors("http://127.0.0.1:3001/", Session{Email: DefaultAdminEmail, Bid: "1", Token: "t"})
	if len(auth) != 4 {
		t.Fatalf("auth vectors=%d", len(auth))
	}
	hasJimBasket := false
	for _, vector := range auth {
		if strings.Contains(vector.Route, "/rest/basket/2") {
			hasJimBasket = true
		}
	}
	if !hasJimBasket {
		t.Fatal("auth gold set must seed jim basket /rest/basket/2")
	}
	if len(CoverageVectors("http://127.0.0.1:3001/", Session{Token: "t"})) != 4 {
		t.Fatalf("coverage vectors=%d", len(CoverageVectors("http://127.0.0.1:3001/", Session{Token: "t"})))
	}
	if len(CoverageCatalog()) != 4 {
		t.Fatalf("coverage catalog=%d", len(CoverageCatalog()))
	}
	if len(AuthCatalog()) != 2 {
		t.Fatalf("auth catalog=%d", len(AuthCatalog()))
	}
}

func TestEvaluateHitsLoginAndSearchOnFakeShop(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && strings.Contains(r.URL.Path, "/rest/user/login"):
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			email, _ := body["email"].(string)
			if strings.Contains(email, "OR") || strings.Contains(email, "or") {
				w.Header().Set("Content-Type", "application/json")
				_, _ = io.WriteString(w, `{"authentication":{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signaturepad","bid":1}}`)
				return
			}
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = io.WriteString(w, `{"error":{"message":"Invalid email or password.","status":401}}`)
		case strings.Contains(r.URL.Path, "/rest/products/search"):
			q := r.URL.Query().Get("q")
			if strings.Contains(q, "'") {
				w.WriteHeader(http.StatusInternalServerError)
				_, _ = io.WriteString(w, "<html><title>Error: SQLITE_ERROR: incomplete input</title></html>")
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, `{"status":"success","data":[{"id":1}]}`)
		default:
			w.Header().Set("Content-Type", "text/html")
			_, _ = io.WriteString(w, `<!doctype html><html><body><app-root></app-root></body></html>`)
		}
	}))
	defer server.Close()

	report, err := Evaluate(context.Background(), server.URL, Options{
		Rod:     false,
		Timeout: 10 * time.Second,
	})
	if err != nil {
		t.Fatal(err)
	}
	if report.Jobs == 0 {
		t.Fatal("expected jobs")
	}
	got := map[string]bool{}
	for _, hit := range report.Hits {
		got[hit.Challenge] = true
	}
	if !got[ChallengeLoginSQLi] {
		t.Fatalf("expected login-sqli, hits=%#v", report.Hits)
	}
	if !got[ChallengeSearchSQLi] {
		t.Fatalf("expected search-sqli, hits=%#v", report.Hits)
	}
	if missing := report.Missing(); len(missing) != 0 {
		t.Fatalf("missing HTTP gold set: %v", missing)
	}
}

func TestEvaluateHitsAuthGoldSetOnFakeShop(t *testing.T) {
	var mu sync.Mutex
	reviews := []map[string]string{
		{"author": "admin@juice-sh.op", "message": "seed"},
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		switch {
		case r.Method == http.MethodPost && strings.Contains(path, "/rest/user/login"):
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			email, _ := body["email"].(string)
			if email != DefaultAdminEmail {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, `{"authentication":{"token":"test-token","bid":1,"umail":"admin@juice-sh.op"}}`)
		case strings.Contains(path, "/rest/basket/"):
			if r.Header.Get("Authorization") == "" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			id := path[strings.LastIndex(path, "/")+1:]
			w.Header().Set("Content-Type", "application/json")
			switch id {
			case "1":
				_, _ = io.WriteString(w, `{"status":"success","data":{"id":1,"UserId":1,"coupon":null,"Products":[]}}`)
			case "2":
				_, _ = io.WriteString(w, `{"status":"success","data":{"id":2,"UserId":2,"coupon":null,"Products":[{"id":4}]}}`)
			default:
				w.WriteHeader(http.StatusNotFound)
			}
		case strings.Contains(strings.ToLower(path), "/api/users"):
			if r.Header.Get("Authorization") == "" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			trimmed := strings.TrimSuffix(path, "/")
			if strings.HasSuffix(strings.ToLower(trimmed), "/users") {
				_, _ = io.WriteString(w, `{"status":"success","data":[{"id":1,"email":"admin@juice-sh.op","role":"admin"},{"id":2,"email":"jim@juice-sh.op","role":"customer"}]}`)
				return
			}
			_, _ = io.WriteString(w, `{"status":"success","data":{"id":2,"email":"jim@juice-sh.op","role":"customer"}}`)
		case strings.Contains(path, "/reviews"):
			if r.Method == http.MethodPut {
				if r.Header.Get("Authorization") == "" {
					w.WriteHeader(http.StatusUnauthorized)
					return
				}
				var body map[string]string
				_ = json.NewDecoder(r.Body).Decode(&body)
				mu.Lock()
				reviews = append(reviews, map[string]string{
					"author":  body["author"],
					"message": body["message"],
				})
				mu.Unlock()
				w.WriteHeader(http.StatusCreated)
				_, _ = io.WriteString(w, `{"status":"success"}`)
				return
			}
			mu.Lock()
			payload, _ := json.Marshal(map[string]any{"status": "success", "data": reviews})
			mu.Unlock()
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write(payload)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	report, err := Evaluate(context.Background(), server.URL, Options{
		Auth:    true,
		Timeout: 10 * time.Second,
	})
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]bool{}
	for _, hit := range report.Hits {
		got[hit.Challenge] = true
	}
	if !got[ChallengeBasketIDOR] || !got[ChallengeAdminUsers] || !got[ChallengeReviewIDOR] {
		t.Fatalf("expected auth gold set, hits=%#v missing=%v", report.Hits, report.Missing())
	}
	if missing := report.Missing(); len(missing) != 0 {
		t.Fatalf("missing auth gold set: %v", missing)
	}
}

func TestEvaluateHitsCoverageGoldSetOnFakeShop(t *testing.T) {
	jwt := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signaturepad"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		switch {
		case r.Method == http.MethodPost && strings.Contains(path, "/rest/user/login"):
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, `{"authentication":{"token":"`+jwt+`","bid":1,"umail":"admin@juice-sh.op"}}`)
		case strings.Contains(path, "/redirect"):
			w.Header().Set("Location", "https://evil.invalid/phish")
			w.WriteHeader(http.StatusFound)
		case strings.Contains(path, "/ftp"):
			if strings.Contains(path, "acquisitions.md") {
				_, _ = io.WriteString(w, "This document is confidential!\nPlanned acquisitions")
				return
			}
			_, _ = io.WriteString(w, "index of /ftp")
		case strings.Contains(strings.ToLower(path), "/api/users"):
			auth := r.Header.Get("Authorization")
			if strings.Contains(auth, "invalid-signature") {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, `{"status":"success","data":[{"id":1,"email":"admin@juice-sh.op","role":"admin"}]}`)
		case strings.Contains(path, "/rest/user/change-password"):
			if r.Header.Get("Authorization") == "" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, `{"user":{"password":"ok"}}`)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	report, err := Evaluate(context.Background(), server.URL, Options{
		Coverage: true,
		Timeout:  10 * time.Second,
	})
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]bool{}
	for _, hit := range report.Hits {
		got[hit.Challenge] = true
	}
	if !got[ChallengeOpenRedirect] || !got[ChallengeJWTNone] || !got[ChallengeFTPFile] || !got[ChallengeCSRF] {
		t.Fatalf("expected coverage gold set, hits=%#v missing=%v", report.Hits, report.Missing())
	}
	if missing := report.Missing(); len(missing) != 0 {
		t.Fatalf("missing coverage gold set: %v", missing)
	}
}
