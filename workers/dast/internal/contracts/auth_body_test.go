package contracts

import "testing"

func TestResolveAuthBodyReplacesPlaceholders(t *testing.T) {
	got := ResolveAuthBody(map[string]any{
		"name":                  "Scanner User",
		"email":                 "{{email}}",
		"username":              "{{user}}",
		"password":              "{{password}}",
		"password_confirmation": "{{password}}",
		"securityQuestion": map[string]any{
			"id": float64(1),
		},
	}, "scanabcd@example.com", "Secretpass1!")

	if got["email"] != "scanabcd@example.com" || got["username"] != "scanabcd" || got["password"] != "Secretpass1!" {
		t.Fatalf("got %#v", got)
	}
	fields := FlattenAuthFields(got)
	if fields["name"] != "Scanner User" || fields["id"] != "1" {
		t.Fatalf("fields %#v", fields)
	}
}

func TestResolveAuthBodyKeepsLiteralUsername(t *testing.T) {
	got := ResolveAuthBody(map[string]any{
		"username": "{{username}}",
		"password": "{{password}}",
	}, "admin", "secret")
	if got["username"] != "admin" || got["password"] != "secret" {
		t.Fatalf("got %#v", got)
	}
}
