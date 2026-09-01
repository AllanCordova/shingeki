package bfs

import (
	"net/url"
	"regexp"
	"strings"
)

var highValueTerms = []string{
	"api", "admin", "user", "usuario", "estoque", "dashboard", "checkout",
	"config", "produto", "produtos", "settings",
}

var lowValueTerms = []string{
	"blog", "sobre", "about", "contato", "contact", "faq", "termos", "terms",
	"privacy", "politica", "ajuda", "help",
}

var crudTerms = []string{
	"criar", "novo", "nova", "new", "add", "adicionar",
	"editar", "edit", "alterar", "atualizar", "update",
	"mostrar", "show", "detalhe", "detail", "view",
	"salvar", "save", "cadastr",
}

var paginationKeys = []string{"page", "pagina", "p", "offset", "cursor"}

var numericSegment = regexp.MustCompile(`^\d+$`)
var uuidSegment = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

func ScoreURL(raw string) int {
	return Score(raw, "")
}

func Score(rawURL, extraText string) int {
	haystack := strings.ToLower(strings.TrimSpace(extraText))
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err == nil && parsed != nil {
		haystack += " " + strings.ToLower(parsed.Path) + " " + strings.ToLower(parsed.RawQuery)
	}

	score := 0
	for _, term := range highValueTerms {
		if containsTerm(haystack, term) {
			score += 10
		}
	}
	for _, term := range crudTerms {
		if containsTerm(haystack, term) {
			score += 10
		}
	}
	for _, term := range lowValueTerms {
		if containsTerm(haystack, term) {
			score -= 10
		}
	}

	if parsed != nil && parsed.Host != "" {
		if hasDynamicQuery(parsed) {
			score += 5
		}
		if hasIdentifierSegment(parsed.Path) {
			score += 5
		}
		if hasPagination(parsed) {
			score -= 10
		}
	}

	return score
}

func containsTerm(haystack, term string) bool {
	term = strings.ToLower(strings.TrimSpace(term))
	if term == "" || haystack == "" {
		return false
	}
	if len(term) >= 4 && strings.Contains(haystack, term) {
		return true
	}
	for _, token := range strings.FieldsFunc(haystack, isTermSeparator) {
		if token == term {
			return true
		}
		if len(term) >= 4 && strings.HasPrefix(token, term) {
			return true
		}
	}
	return false
}

func isTermSeparator(r rune) bool {
	return r == '/' || r == '?' || r == '&' || r == '=' || r == '-' || r == '_' || r == '.' || r == ' '
}

func hasDynamicQuery(parsed *url.URL) bool {
	if parsed.RawQuery == "" {
		return false
	}
	for key, values := range parsed.Query() {
		keyLower := strings.ToLower(key)
		if keyLower == "id" || strings.HasSuffix(keyLower, "id") || keyLower == "uuid" || keyLower == "slug" {
			if len(values) > 0 && strings.TrimSpace(values[0]) != "" {
				return true
			}
		}
		for _, value := range values {
			if numericSegment.MatchString(value) || uuidSegment.MatchString(value) {
				return true
			}
		}
	}
	return false
}

func hasIdentifierSegment(path string) bool {
	for _, part := range strings.Split(path, "/") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if numericSegment.MatchString(part) || uuidSegment.MatchString(part) {
			return true
		}
	}
	return false
}

func hasPagination(parsed *url.URL) bool {
	query := parsed.Query()
	for _, key := range paginationKeys {
		if _, ok := query[key]; ok {
			return true
		}
	}
	path := strings.ToLower(parsed.Path)
	return strings.Contains(path, "/page/") || strings.Contains(path, "/pagina/")
}
