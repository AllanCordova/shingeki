package dynamic

import (
	"strings"
)

type formCandidate struct {
	Index       int         `json:"index"`
	Action      string      `json:"action"`
	Method      string      `json:"method"`
	Text        string      `json:"text"`
	HasPassword bool        `json:"hasPassword"`
	Fields      []formField `json:"fields"`
}

type formField struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	Autocomplete string `json:"autocomplete"`
	Tag          string `json:"tag"`
}

func shouldSkipForm(form formCandidate, hasSession bool) bool {
	combined := strings.ToLower(strings.TrimSpace(form.Text + " " + form.Action + " " + form.Method))
	for _, field := range form.Fields {
		combined += " " + strings.ToLower(field.Name+" "+field.Type+" "+field.Autocomplete)
	}

	destructive := []string{
		"logout", "log out", "sign out", "signout", "sair",
		"delete account", "excluir conta", "apagar conta", "excluir",
		"pagamento", "payment", "checkout", "credit card", "cartao", "cartão",
		"unsubscribe", "cancelar assinatura",
		"remove", "destroy", "transfer", "transferir", "debit", "wire",
		"purchase", "comprar", "buy now", "confirmar pagamento",
	}
	for _, word := range destructive {
		if strings.Contains(combined, word) {
			return true
		}
	}

	if hasSession && looksLikeLoginForm(form, combined) {
		return true
	}
	return false
}

func looksLikeLoginForm(form formCandidate, combined string) bool {
	if form.HasPassword {
		loginHints := []string{"login", "signin", "sign-in", "entrar", "auth", "password", "senha"}
		for _, hint := range loginHints {
			if strings.Contains(combined, hint) {
				return true
			}
		}
		return true
	}
	return strings.Contains(combined, "login") || strings.Contains(combined, "signin")
}

func fillValueForField(field formField) (string, bool) {
	inputType := strings.ToLower(strings.TrimSpace(field.Type))
	name := strings.ToLower(strings.TrimSpace(field.Name + " " + field.Autocomplete))

	switch inputType {
	case "hidden", "submit", "button", "image", "reset", "file":
		return "", false
	}

	if looksLikeCardField(name) {
		return "", false
	}

	switch inputType {
	case "email":
		return "dast-probe@example.test", true
	case "number", "range":
		return "1", true
	case "tel":
		return "11999999999", true
	case "url":
		return "https://example.test", true
	case "password":
		return "ProbePass1!", true
	case "date":
		return "2026-01-15", true
	case "checkbox", "radio":
		return "on", true
	}

	if strings.Contains(name, "email") {
		return "dast-probe@example.test", true
	}
	if strings.Contains(name, "phone") || strings.Contains(name, "tel") {
		return "11999999999", true
	}
	return "dast-probe", true
}

func looksLikeCardField(name string) bool {
	markers := []string{
		"card", "cartao", "cartão", "cc-number", "ccnumber", "cvv", "cvc",
		"credit", "debit", "iban",
	}
	for _, marker := range markers {
		if strings.Contains(name, marker) {
			return true
		}
	}
	return false
}
