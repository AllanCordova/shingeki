package dynamic

import "testing"

func TestShouldSkipClickLabel(t *testing.T) {
	cases := []struct {
		text string
		href string
		skip bool
	}{
		{"Criar produto", "/produtos/novo", false},
		{"Logout", "/sair", true},
		{"Sair da conta", "", true},
		{"Inscreva-se", "/inscricao", true},
		{"Entrar", "/login?r=/", true},
		{"Editar", "javascript:void(0)", true},
		{"Ajuda", "mailto:a@b.com", true},
		{"Detalhes", "/produtos/1", false},
	}
	for _, tc := range cases {
		got := shouldSkipClickLabel(tc.text, tc.href)
		if got != tc.skip {
			t.Fatalf("%q %q: skip=%v want %v", tc.text, tc.href, got, tc.skip)
		}
	}
}

func TestClickPriorityPrefersCRUD(t *testing.T) {
	create := clickPriority("Criar produto", "/produtos/novo")
	plain := clickPriority("Home", "/")
	if create <= plain {
		t.Fatalf("expected create priority %d > plain %d", create, plain)
	}
}

func TestRankClickCandidatesOrdersAndDedupes(t *testing.T) {
	pageURL := "https://app.example/produtos"
	ranked := rankClickCandidates(pageURL, []clickCandidate{
		{Index: 0, Tag: "a", Text: "Home", Href: "/"},
		{Index: 1, Tag: "button", Text: "Criar", Href: ""},
		{Index: 2, Tag: "button", Text: "Criar", Href: ""},
		{Index: 3, Tag: "a", Text: "Logout", Href: "/logout"},
		{Index: 4, Tag: "a", Text: "Editar", Href: "/produtos/1/edit"},
	})
	if len(ranked) != 3 {
		t.Fatalf("expected 3 candidates after filter/dedupe, got %d", len(ranked))
	}
	if ranked[0].Text != "Criar" && ranked[0].Text != "Editar" {
		t.Fatalf("expected CRUD-ish first, got %q", ranked[0].Text)
	}
	if ranked[0].Priority < ranked[len(ranked)-1].Priority {
		t.Fatalf("expected descending priority")
	}
}
