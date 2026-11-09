package discovery

import (
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestVectorsFromRouteMapAttacksOnlyListedRoutes(t *testing.T) {
	vectors, err := VectorsFromRouteMap("https://api.example.com/ignored", []contracts.DispatchRoute{
		{Method: "GET", Path: "api/v1/user"},
		{Method: "GET", Path: "/api/v1/product"},
		{Method: "POST", Path: "/api/v1/product", Body: []byte(`{"name":"exemplo"}`)},
		{Method: "get", Path: "/api/v1/product/{id}", Query: contracts.StringMap{"id": "1", "q": "busca"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got := make([]string, 0, len(vectors))
	for _, vector := range vectors {
		got = append(got, vector.Method+" "+vector.TargetLocation+" "+vector.Route)
	}

	want := []string{
		"GET URL_PATH https://api.example.com/api/v1/user",
		"GET URL_PATH https://api.example.com/api/v1/product",
		"POST URL_PATH https://api.example.com/api/v1/product",
		"POST JSON_BODY https://api.example.com/api/v1/product",
		"GET URL_PATH https://api.example.com/api/v1/product/1",
		"GET QUERY_PARAMETER https://api.example.com/api/v1/product/1?q=busca",
	}
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("vectors:\n%s\nwant:\n%s", strings.Join(got, "\n"), strings.Join(want, "\n"))
	}

	var body contracts.AttackVector
	for _, vector := range vectors {
		if vector.TargetLocation == "JSON_BODY" {
			body = vector
		}
	}
	if body.Params["name"] != "exemplo" || !strings.Contains(body.Body, `"name"`) {
		t.Fatalf("json body vector = %+v", body)
	}
}

func TestVectorsFromRouteMapKeepsFormAndXMLBodies(t *testing.T) {
	vectors, err := VectorsFromRouteMap("https://lab.test", []contracts.DispatchRoute{
		{Method: "POST", Path: "/login.aspx", Content: "form", Body: []byte(`{"tbUsername":"user","tbPassword":"password"}`)},
		{Method: "POST", Path: "/catalog/product/stock", Content: "xml", XMLRoot: "stockCheck", Body: []byte(`{"productId":"1","storeId":"1"}`)},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var form, xml contracts.AttackVector
	for _, vector := range vectors {
		switch vector.TargetLocation {
		case "FORM":
			form = vector
		case "XML_BODY":
			xml = vector
		case "JSON_BODY":
			t.Fatalf("form and xml routes must not become JSON: %+v", vector)
		}
	}
	if form.Params["tbUsername"] != "user" {
		t.Fatalf("form vector = %+v", form)
	}
	if xml.XMLRoot != "stockCheck" || xml.Params["productId"] != "1" {
		t.Fatalf("xml vector = %+v", xml)
	}
}

func TestVectorsFromRouteMapRejectsOffTargetPaths(t *testing.T) {
	cases := []contracts.DispatchRoute{
		{Path: "https://evil.example/api/v1/user"},
		{Path: "//evil.example/api/v1/user"},
		{Path: "/api/../admin"},
		{Path: "/api/v1/product/{id}"},
	}
	for _, route := range cases {
		if _, err := VectorsFromRouteMap("https://api.example.com", []contracts.DispatchRoute{route}); err == nil {
			t.Fatalf("expected error for %#v", route)
		}
	}
}
