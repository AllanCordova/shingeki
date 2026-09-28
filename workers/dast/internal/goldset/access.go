package goldset

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

const (
	ChallengeAdminUnauth     = "admin-unauth"
	ChallengeOrderBOLA       = "order-bola"
	ChallengeMassAssignment  = "mass-assignment"
	ChallengeTenantIsolation = "tenant-isolation"
	AccessTokenAlice         = "token-alice"
	AccessTokenBob           = "token-bob"
	AccessOrderAlice         = "ord_alice"
	AccessOrderBob           = "ord_bob"
	AccessTenantAlice        = "tenant-a"
	AccessTenantBob          = "tenant-b"
	accessAdminUsersJSON     = `{"users":[{"id":"1","email":"alice@example.com","role":"admin"},{"id":"2","email":"bob@example.com","role":"user"}]}`
)

func ExpectedAccessChallenges() []string {
	return []string{
		ChallengeAdminUnauth,
		ChallengeOrderBOLA,
		ChallengeMassAssignment,
		ChallengeTenantIsolation,
	}
}

func AccessHandler() http.Handler {
	return accessMux(false)
}

func PatchedAccessHandler() http.Handler {
	return accessMux(true)
}

func accessMux(secure bool) http.Handler {
	mux := http.NewServeMux()
	writeJSON := func(w http.ResponseWriter, status int, body string) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}
	bearer := func(r *http.Request) string {
		value := strings.TrimSpace(r.Header.Get("Authorization"))
		return strings.TrimSpace(strings.TrimPrefix(value, "Bearer "))
	}

	listUsers := func(w http.ResponseWriter, r *http.Request) {
		if secure && bearer(r) == "" {
			writeJSON(w, http.StatusUnauthorized, `{"error":"unauthorized"}`)
			return
		}
		writeJSON(w, http.StatusOK, accessAdminUsersJSON)
	}
	mux.HandleFunc("GET /api/admin/users", listUsers)
	mux.HandleFunc("GET /api/admin/users/{id}", listUsers)

	mux.HandleFunc("GET /api/orders/{id}", func(w http.ResponseWriter, r *http.Request) {
		token := bearer(r)
		if token == "" {
			writeJSON(w, http.StatusUnauthorized, `{"error":"unauthorized"}`)
			return
		}
		id := r.PathValue("id")
		if secure {
			if token == AccessTokenAlice && id != AccessOrderAlice {
				writeJSON(w, http.StatusForbidden, `{"error":"forbidden"}`)
				return
			}
			if token == AccessTokenBob && id != AccessOrderBob {
				writeJSON(w, http.StatusForbidden, `{"error":"forbidden"}`)
				return
			}
		}
		switch id {
		case AccessOrderAlice:
			writeJSON(w, http.StatusOK, `{"id":"ord_alice","owner":"alice","total":10}`)
		case AccessOrderBob:
			writeJSON(w, http.StatusOK, `{"id":"ord_bob","owner":"bob","total":44}`)
		default:
			writeJSON(w, http.StatusNotFound, `{"error":"not found"}`)
		}
	})

	mux.HandleFunc("PATCH /api/profile", func(w http.ResponseWriter, r *http.Request) {
		if bearer(r) == "" {
			writeJSON(w, http.StatusUnauthorized, `{"error":"unauthorized"}`)
			return
		}
		role := "user"
		price := "0"
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if !secure {
			if value, ok := body["role"].(string); ok && value != "" {
				role = value
			}
			if value, ok := body["price"].(string); ok && value != "" {
				price = value
			}
		}
		writeJSON(w, http.StatusOK, `{"email":"alice@example.com","role":"`+role+`","price":"`+price+`"}`)
	})

	mux.HandleFunc("GET /api/tenants/{id}", func(w http.ResponseWriter, r *http.Request) {
		token := bearer(r)
		if token == "" {
			writeJSON(w, http.StatusUnauthorized, `{"error":"unauthorized"}`)
			return
		}
		id := r.PathValue("id")
		if secure && token == AccessTokenAlice && id != AccessTenantAlice {
			writeJSON(w, http.StatusForbidden, `{"error":"forbidden"}`)
			return
		}
		switch id {
		case AccessTenantAlice:
			writeJSON(w, http.StatusOK, `{"id":"tenant-a","name":"Acme","plan":"pro"}`)
		case AccessTenantBob:
			writeJSON(w, http.StatusOK, `{"id":"tenant-b","name":"Globex","plan":"enterprise"}`)
		default:
			writeJSON(w, http.StatusNotFound, `{"error":"not found"}`)
		}
	})

	return mux
}

func AccessCatalogJobs(origin string) (vectors [][]contracts.AttackVector, catalogs [][]contracts.AttackItem) {
	origin = targeturl.Origin(origin)
	pathPayload, _ := json.Marshal(map[string]any{"value": AccessOrderBob})
	adminPayload, _ := json.Marshal(map[string]any{"value": "2"})
	rolePayload, _ := json.Marshal(map[string]any{"value": "admin", "field": "role"})
	tenantPayload, _ := json.Marshal(map[string]any{"value": AccessTenantBob})

	admin := contracts.NewAttackVector(origin+"/api/admin/users/", http.MethodGet, "URL_PATH")
	order := contracts.NewAttackVector(origin+"/api/orders/"+AccessOrderAlice, http.MethodGet, "URL_PATH")
	order.Headers["Authorization"] = "Bearer " + AccessTokenAlice
	profile := contracts.NewAttackVector(origin+"/api/profile", http.MethodPatch, "JSON_BODY")
	profile.Headers["Authorization"] = "Bearer " + AccessTokenAlice
	profile.Params["role"] = "user"
	profile.Body = `{"email":"alice@example.com","role":"user"}`
	tenant := contracts.NewAttackVector(origin+"/api/tenants/"+AccessTenantAlice, http.MethodGet, "URL_PATH")
	tenant.Headers["Authorization"] = "Bearer " + AccessTokenAlice

	return [][]contracts.AttackVector{
			{admin},
			{order},
			{profile},
			{tenant},
		}, [][]contracts.AttackItem{
			{{AttackID: "gold-admin-unauth", Category: "IDOR", TargetLocation: "URL_PATH", RiskLevel: "HIGH", Payload: adminPayload}},
			{{AttackID: "gold-order-bola", Category: "IDOR", TargetLocation: "URL_PATH", RiskLevel: "HIGH", Payload: pathPayload}},
			{{AttackID: "gold-mass-role", Category: "IDOR", TargetLocation: "JSON_BODY", RiskLevel: "HIGH", Payload: rolePayload}},
			{{AttackID: "gold-tenant", Category: "IDOR", TargetLocation: "URL_PATH", RiskLevel: "HIGH", Payload: tenantPayload}},
		}
}

func ClassifyAccess(route, category string) string {
	if !strings.Contains(strings.ToUpper(category), "IDOR") {
		return ""
	}
	lower := strings.ToLower(route)
	switch {
	case strings.Contains(lower, "/api/admin/users"):
		return ChallengeAdminUnauth
	case strings.Contains(lower, "/api/orders"):
		return ChallengeOrderBOLA
	case strings.Contains(lower, "/api/profile"):
		return ChallengeMassAssignment
	case strings.Contains(lower, "/api/tenants"):
		return ChallengeTenantIsolation
	default:
		return ""
	}
}
