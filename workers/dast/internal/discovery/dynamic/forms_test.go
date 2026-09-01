package dynamic

import "testing"

func TestShouldSkipDestructiveAndLoginForms(t *testing.T) {
	logout := formCandidate{
		Action: "/logout",
		Text:   "Sair",
		Fields: []formField{{Name: "_token", Type: "hidden"}},
	}
	if !shouldSkipForm(logout, true) {
		t.Fatal("expected logout form skip")
	}

	payment := formCandidate{
		Action: "/checkout",
		Text:   "Pagamento",
		Fields: []formField{{Name: "card_number", Type: "text"}},
	}
	if !shouldSkipForm(payment, false) {
		t.Fatal("expected payment form skip")
	}

	login := formCandidate{
		Action:      "/login",
		HasPassword: true,
		Fields:      []formField{{Name: "email", Type: "email"}, {Name: "password", Type: "password"}},
	}
	if !shouldSkipForm(login, true) {
		t.Fatal("expected login form skip when session exists")
	}
	if shouldSkipForm(login, false) {
		t.Fatal("login form should be fillable without a session")
	}

	create := formCandidate{
		Action: "/estoque/novo",
		Text:   "Novo produto",
		Fields: []formField{{Name: "nome", Type: "text"}},
	}
	if shouldSkipForm(create, true) {
		t.Fatal("expected product form to be submitted")
	}

	destroy := formCandidate{
		Action: "/items/destroy",
		Text:   "Remover item",
		Fields: []formField{{Name: "id", Type: "hidden"}},
	}
	if !shouldSkipForm(destroy, true) {
		t.Fatal("expected destructive form skip")
	}
}

func TestFillValueForFieldDictionary(t *testing.T) {
	email, ok := fillValueForField(formField{Name: "email", Type: "email"})
	if !ok || email != "dast-probe@example.test" {
		t.Fatalf("email=%s ok=%v", email, ok)
	}
	if _, ok := fillValueForField(formField{Name: "avatar", Type: "file"}); ok {
		t.Fatal("file inputs must be skipped")
	}
	if _, ok := fillValueForField(formField{Name: "card_number", Type: "text"}); ok {
		t.Fatal("card fields must be skipped")
	}
	if _, ok := fillValueForField(formField{Name: "csrf", Type: "hidden"}); ok {
		t.Fatal("hidden inputs must be skipped")
	}
	text, ok := fillValueForField(formField{Name: "nome", Type: "text"})
	if !ok || text != "dast-probe" {
		t.Fatalf("text=%s ok=%v", text, ok)
	}
}
