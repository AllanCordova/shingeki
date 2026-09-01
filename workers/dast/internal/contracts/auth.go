package contracts

import (
	"net/url"
	"strings"
)

type TargetStorage struct {
	Local   StringMap      `json:"local,omitempty"`
	Session StringMap      `json:"session,omitempty"`
	Origins []OriginStorage `json:"origins,omitempty"`
}

type OriginStorage struct {
	Origin  string    `json:"origin"`
	Local   StringMap `json:"local,omitempty"`
	Session StringMap `json:"session,omitempty"`
}

type CapturedCookie struct {
	Name           string              `json:"name"`
	Value          string              `json:"value"`
	Domain         string              `json:"domain,omitempty"`
	Path           string              `json:"path,omitempty"`
	Secure         bool                `json:"secure,omitempty"`
	HTTPOnly       bool                `json:"httpOnly,omitempty"`
	SameSite       string              `json:"sameSite,omitempty"`
	HostOnly       bool                `json:"hostOnly,omitempty"`
	Session        bool                `json:"session,omitempty"`
	ExpirationDate float64             `json:"expirationDate,omitempty"`
	PartitionKey   *CookiePartitionKey `json:"partitionKey,omitempty"`
}

type CookiePartitionKey struct {
	TopLevelSite         string `json:"topLevelSite"`
	HasCrossSiteAncestor bool   `json:"hasCrossSiteAncestor,omitempty"`
}

type CapturedRoute struct {
	Method string `json:"method"`
	URL    string `json:"url"`
	Type   string `json:"type,omitempty"`
}

type TargetAuth struct {
	Type      string            `json:"type"`
	Headers   map[string]string `json:"headers"`
	Storage   *TargetStorage    `json:"storage,omitempty"`
	Cookies   []CapturedCookie  `json:"cookies,omitempty"`
	UserAgent string            `json:"user_agent,omitempty"`
	Routes    []CapturedRoute   `json:"routes,omitempty"`
}

func (b DispatchBatch) AuthHeaders() map[string]string {
	return EffectiveAuthHeaders(b.Auth)
}

func (s *TargetStorage) LocalMap() map[string]string {
	if s == nil || len(s.Local) == 0 {
		return nil
	}
	out := make(map[string]string, len(s.Local))
	for key, value := range s.Local {
		out[key] = value
	}
	return out
}

func (s *TargetStorage) SessionMap() map[string]string {
	if s == nil || len(s.Session) == 0 {
		return nil
	}
	out := make(map[string]string, len(s.Session))
	for key, value := range s.Session {
		out[key] = value
	}
	return out
}

func EffectiveAuthHeaders(auth *TargetAuth) map[string]string {
	if auth == nil {
		return nil
	}

	out := make(map[string]string, len(auth.Headers)+2)
	for key, value := range auth.Headers {
		out[key] = value
	}

	if headerValue(out, "Cookie") == "" {
		if header := CookieHeaderFromCookies(auth.Cookies); header != "" {
			out["Cookie"] = header
		}
	}

	if headerValue(out, "Authorization") == "" {
		if token := storageBearerToken(auth.Storage); token != "" {
			out["Authorization"] = token
		}
	}

	if len(out) == 0 {
		return nil
	}
	return out
}

func CookieHeaderFromCookies(cookies []CapturedCookie) string {
	return CookieHeaderForURL(cookies, "")
}

func CookieHeaderForURL(cookies []CapturedCookie, rawURL string) string {
	if len(cookies) == 0 {
		return ""
	}
	parts := make([]string, 0, len(cookies))
	for _, cookie := range cookies {
		name := strings.TrimSpace(cookie.Name)
		value := strings.TrimSpace(cookie.Value)
		if name == "" || value == "" {
			continue
		}
		if rawURL != "" && !CookieAppliesToURL(cookie, rawURL) {
			continue
		}
		parts = append(parts, name+"="+value)
	}
	return strings.Join(parts, "; ")
}

func CookieAppliesToURL(cookie CapturedCookie, rawURL string) bool {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" {
		return false
	}
	if cookie.Secure && !strings.EqualFold(parsed.Scheme, "https") {
		return false
	}
	reqPath := parsed.Path
	if reqPath == "" {
		reqPath = "/"
	}
	cookiePath := strings.TrimSpace(cookie.Path)
	if cookiePath == "" {
		cookiePath = "/"
	}
	if cookiePath != "/" {
		prefix := strings.TrimRight(cookiePath, "/")
		if reqPath != cookiePath && reqPath != prefix && !strings.HasPrefix(reqPath, prefix+"/") {
			return false
		}
	}
	domain := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(cookie.Domain)), ".")
	host := strings.ToLower(parsed.Hostname())
	if domain == "" {
		return true
	}
	if cookie.HostOnly {
		return host == domain
	}
	return host == domain || strings.HasSuffix(host, "."+domain)
}

func MergeHeaders(global, local map[string]string) map[string]string {
	if len(global) == 0 && len(local) == 0 {
		return nil
	}

	out := make(map[string]string, len(global)+len(local))
	for key, value := range global {
		out[key] = value
	}
	for key, value := range local {
		out[key] = value
	}

	return out
}

func headerValue(headers map[string]string, name string) string {
	for key, value := range headers {
		if strings.EqualFold(strings.TrimSpace(key), strings.TrimSpace(name)) {
			return value
		}
	}
	return ""
}

func storageBearerToken(storage *TargetStorage) string {
	if storage == nil {
		return ""
	}
	if token := tokenFromStorageMap(map[string]string(storage.Local)); token != "" {
		return token
	}
	if token := tokenFromStorageMap(map[string]string(storage.Session)); token != "" {
		return token
	}
	for _, origin := range storage.Origins {
		if token := tokenFromStorageMap(map[string]string(origin.Local)); token != "" {
			return token
		}
		if token := tokenFromStorageMap(map[string]string(origin.Session)); token != "" {
			return token
		}
	}
	return ""
}

var storageTokenKeys = []string{
	"authorization",
	"access_token",
	"accesstoken",
	"id_token",
	"idtoken",
	"auth_token",
	"authtoken",
	"jwt",
}

func tokenFromStorageMap(values map[string]string) string {
	if len(values) == 0 {
		return ""
	}
	lowered := make(map[string]string, len(values))
	for key, value := range values {
		lowered[strings.ToLower(strings.TrimSpace(key))] = strings.TrimSpace(value)
	}
	for _, key := range storageTokenKeys {
		if token := normalizeStoredToken(lowered[key]); token != "" {
			return token
		}
	}
	if token := normalizeStoredToken(lowered["token"]); token != "" && strings.Count(strings.TrimSpace(lowered["token"]), ".") >= 2 {
		return token
	}
	return ""
}

func normalizeStoredToken(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || strings.HasPrefix(value, "{") || strings.HasPrefix(value, "[") {
		return ""
	}
	if len(value) > 8192 {
		return ""
	}
	if strings.HasPrefix(strings.ToLower(value), "bearer ") {
		return value
	}
	if strings.Count(value, ".") >= 2 || looksLikeOpaqueToken(value) {
		return "Bearer " + value
	}
	return ""
}

func looksLikeOpaqueToken(value string) bool {
	if len(value) < 24 {
		return false
	}
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' || r == '.' || r == '+' || r == '/' || r == '=' {
			continue
		}
		return false
	}
	return true
}
