package dynamic

import (
	"net/url"
	"strings"
)

type clickCandidate struct {
	Index    int
	Tag      string
	Text     string
	Href     string
	Role     string
	Priority int
	Key      string
}

func candidateKey(tag, text, href string) string {
	return strings.ToLower(strings.TrimSpace(tag)) + "|" +
		strings.ToLower(strings.TrimSpace(text)) + "|" +
		strings.ToLower(strings.TrimSpace(href))
}

func shouldSkipClickLabel(text, href string) bool {
	combined := strings.ToLower(strings.TrimSpace(text + " " + href))
	if combined == "" {
		return false
	}
	dangerous := []string{
		"logout", "log out", "sign out", "signout",
		"sair", "desconectar", "encerrar sess",
		"delete account", "excluir conta", "apagar conta",
		"inscri", "cadastro", "cadastrar", "sign up", "signup",
		"criar conta", "registre-se", "register",
		"/login", "/signin", "/sign-in", "/inscricao",
	}
	for _, word := range dangerous {
		if strings.Contains(combined, word) {
			return true
		}
	}

	hrefLower := strings.ToLower(strings.TrimSpace(href))
	if hrefLower == "" {
		return false
	}
	if strings.HasPrefix(hrefLower, "javascript:") ||
		strings.HasPrefix(hrefLower, "mailto:") ||
		strings.HasPrefix(hrefLower, "tel:") ||
		strings.HasPrefix(hrefLower, "data:") {
		return true
	}
	return false
}

func clickPriority(text, href string) int {
	combined := strings.ToLower(strings.TrimSpace(text + " " + href))
	score := 0
	boosts := []string{
		"criar", "novo", "nova", "new", "add", "adicionar",
		"editar", "edit", "alterar", "atualizar", "update",
		"mostrar", "show", "detalhe", "detail", "ver ", "view",
		"salvar", "save", "cadastr",
	}
	for _, word := range boosts {
		if strings.Contains(combined, word) {
			score += 10
		}
	}
	if strings.TrimSpace(href) != "" && !strings.HasPrefix(strings.ToLower(href), "#") {
		score += 2
	}
	return score
}

func isUsefulHref(pageURL, href string) bool {
	href = strings.TrimSpace(href)
	if href == "" || href == "#" || strings.HasPrefix(href, "#") {
		return true // buttons / in-page handlers still worth trying once
	}
	if shouldSkipClickLabel("", href) {
		return false
	}
	base, err := url.Parse(pageURL)
	if err != nil {
		return false
	}
	ref, err := url.Parse(href)
	if err != nil {
		return false
	}
	resolved := base.ResolveReference(ref)
	if resolved.Scheme != "http" && resolved.Scheme != "https" {
		return false
	}
	return true
}

func rankClickCandidates(pageURL string, raw []clickCandidate) []clickCandidate {
	out := make([]clickCandidate, 0, len(raw))
	seen := make(map[string]struct{}, len(raw))
	for _, c := range raw {
		if shouldSkipClickLabel(c.Text, c.Href) {
			continue
		}
		if !isUsefulHref(pageURL, c.Href) {
			continue
		}
		c.Key = candidateKey(c.Tag, c.Text, c.Href)
		if _, ok := seen[c.Key]; ok {
			continue
		}
		seen[c.Key] = struct{}{}
		c.Priority = clickPriority(c.Text, c.Href)
		out = append(out, c)
	}

	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j].Priority > out[i].Priority {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out
}
