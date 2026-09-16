package dynamic

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/go-rod/rod"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func queryVectorFromPageURL(raw string) (contracts.AttackVector, bool) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return contracts.AttackVector{}, false
	}
	params := map[string]string{}
	for key, values := range parsed.Query() {
		if len(values) > 0 {
			params[key] = values[0]
		}
	}
	if _, fragQuery, ok := targeturl.SplitFragment(parsed.Fragment); ok {
		for key, values := range fragQuery {
			if len(values) > 0 {
				params[key] = values[0]
			}
		}
	}
	if len(params) == 0 {
		return contracts.AttackVector{}, false
	}
	vector := contracts.NewAttackVector(raw, http.MethodGet, "QUERY_PARAMETER")
	vector.Params = params
	return vector, true
}

func hashSearchVector(targetURL string) (contracts.AttackVector, bool) {
	route := targeturl.HashSearchURL(targetURL)
	if route == "" {
		return contracts.AttackVector{}, false
	}
	vector := contracts.NewAttackVector(route, http.MethodGet, "QUERY_PARAMETER")
	vector.Params["q"] = ""
	return vector, true
}

func (r *RodCrawler) pageHasSearchInput(page *rod.Page) bool {
	if page == nil {
		return false
	}
	res, err := page.Eval(`() => {
		const nodes = [...document.querySelectorAll('input, textarea')];
		return nodes.some((el) => {
			const type = (el.getAttribute('type') || '').toLowerCase();
			if (type === 'hidden' || type === 'password' || type === 'checkbox' || type === 'radio' || type === 'file') {
				return false;
			}
			const hay = [
				type,
				el.name,
				el.id,
				el.placeholder,
				el.getAttribute('aria-label'),
				el.className,
			].join(' ').toLowerCase();
			return type === 'search' || hay.includes('search') || hay.includes('busca') || hay.includes('pesquis');
		});
	}`)
	if err != nil || res == nil {
		return false
	}
	return res.Value.Bool()
}
