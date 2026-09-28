package dynamic

import (
	"strings"
	"testing"
)

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

func TestVectorFromFormRecordsGetQueryParameter(t *testing.T) {
	vector, ok := vectorFromForm("http://127.0.0.1:3010/preview", formCandidate{
		Action: "/preview",
		Method: "GET",
		Fields: []formField{{Name: "q", Type: "text"}},
	})
	if !ok {
		t.Fatal("expected vector")
	}
	if vector.TargetLocation != "QUERY_PARAMETER" {
		t.Fatalf("location=%s", vector.TargetLocation)
	}
	if vector.Method != "GET" {
		t.Fatalf("method=%s", vector.Method)
	}
	if _, ok := vector.Params["q"]; !ok {
		t.Fatal("expected q param")
	}
	if !strings.Contains(vector.Route, "q=") {
		t.Fatalf("route missing query: %s", vector.Route)
	}
}

func TestVectorFromFormKeepsPostAsForm(t *testing.T) {
	vector, ok := vectorFromForm("http://127.0.0.1:3010/login", formCandidate{
		Action: "/login",
		Method: "POST",
		Fields: []formField{{Name: "email", Type: "email"}, {Name: "password", Type: "password"}},
	})
	if !ok {
		t.Fatal("expected vector")
	}
	if vector.TargetLocation != "FORM" {
		t.Fatalf("location=%s", vector.TargetLocation)
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
