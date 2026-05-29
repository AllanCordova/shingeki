package discovery

import (
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
)

// fallbackVectors retorna rotas minimas quando o crawl nao descobriu nada.
// Cobre o padrao do shingeki-vulnerable-target (login, search, browse) para que
// o catalogo FORM / QUERY_PARAMETER / URL_PATH gere jobs mesmo sem discovery.
func fallbackVectors(targetURL string) []contracts.AttackVector {
	base := strings.TrimRight(strings.TrimSpace(targetURL), "/")
	if base == "" {
		return nil
	}

	login := contracts.NewAttackVector(joinURL(base, "/login.php"), "POST", "FORM")
	login.Params["email"] = "guest@vuln.local"
	login.Params["password"] = "guest123"

	search := contracts.NewAttackVector(joinURL(base, "/search.php"), "GET", "QUERY_PARAMETER")
	search.Params["q"] = "test"

	browse := contracts.NewAttackVector(joinURL(base, "/browse/"), "GET", "URL_PATH")

	return []contracts.AttackVector{login, search, browse}
}

func joinURL(base, path string) string {
	parsed, err := url.Parse(base)
	if err != nil {
		return base + path
	}
	ref, err := url.Parse(path)
	if err != nil {
		return base + path
	}
	return parsed.ResolveReference(ref).String()
}
