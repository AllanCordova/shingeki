package dynamic

import (
	"net/http"
	"testing"
)

func TestClassifyTargetLocation(t *testing.T) {
	tests := []struct {
		method      string
		contentType string
		route       string
		body        string
		want        string
	}{
		{http.MethodGet, "", "https://app.example/produtos", "", "URL_PATH"},
		{http.MethodGet, "", "https://app.example/search?q=1", "", "QUERY_PARAMETER"},
		{http.MethodPost, "application/json", "https://app.example/api/v1/produtos", `{"name":"x"}`, "JSON_BODY"},
		{http.MethodPost, "application/x-www-form-urlencoded", "https://app.example/login", "a=b", "FORM"},
		{http.MethodPost, "multipart/form-data; boundary=x", "https://app.example/upload", "", "FORM"},
		{http.MethodPost, "", "https://app.example/api", "", "API_ENDPOINT"},
		{http.MethodPost, "application/json", "https://app.example/graphql", `{"operationName":"SaveProduct"}`, "JSON_BODY"},
		{http.MethodPost, "application/xml", "https://app.example/stock", `<stockCheck></stockCheck>`, "XML_BODY"},
		{http.MethodPost, "", "https://app.example/stock", `%3C%3Fxml%20version%3D%221.0%22%3F%3E%3CstockCheck%3E%3C%2FstockCheck%3E`, "XML_BODY"},
	}
	for _, tt := range tests {
		if got := classifyTargetLocation(tt.method, tt.contentType, tt.route, tt.body); got != tt.want {
			t.Fatalf("%s %q: got %s want %s", tt.method, tt.contentType, got, tt.want)
		}
	}
}

func TestNetworkVectorSkipsNoiseAndKeepsAPI(t *testing.T) {
	target := "https://app.example"
	if _, ok := networkVector(target, http.MethodOptions, "https://app.example/api/v1/produtos", "", ""); ok {
		t.Fatal("expected OPTIONS to be skipped")
	}
	if _, ok := networkVector(target, http.MethodGet, "https://cdn.example/app.js", "", ""); ok {
		t.Fatal("expected cross-origin asset to be skipped")
	}
	vector, ok := networkVector(target, http.MethodPost, "https://app.example/api/v1/produtos", "application/json", `{"nome":"caderno"}`)
	if !ok {
		t.Fatal("expected API POST vector")
	}
	if vector.TargetLocation != "JSON_BODY" {
		t.Fatalf("location=%s", vector.TargetLocation)
	}
	if vector.Params["nome"] != "caderno" {
		t.Fatalf("params=%v", vector.Params)
	}
}

func TestNetworkVectorCapturesGraphQLOperation(t *testing.T) {
	vector, ok := networkVector(
		"https://app.example",
		http.MethodPost,
		"https://app.example/graphql",
		"application/json",
		`{"operationName":"SaveProduct","query":"mutation SaveProduct($input: ProductInput!) { save(input: $input) { id } }","variables":{"input":{"name":"x"}}}`,
	)
	if !ok {
		t.Fatal("expected graphql vector")
	}
	if vector.Params["operationName"] != "SaveProduct" {
		t.Fatalf("operationName=%s", vector.Params["operationName"])
	}
	if _, ok := vector.Params["input"]; !ok {
		t.Fatalf("expected graphql variable keys, got %v", vector.Params)
	}
}

func TestNetworkVectorReadsXMLFields(t *testing.T) {
	body := `<?xml version="1.0" encoding="UTF-8"?><stockCheck><productId>1</productId><storeId>2</storeId></stockCheck>`
	vector, ok := networkVector("https://shop.example", http.MethodPost, "https://shop.example/catalog/product/stock", "application/xml", body)
	if !ok {
		t.Fatal("expected xml vector")
	}
	if vector.TargetLocation != "XML_BODY" {
		t.Fatalf("location=%s", vector.TargetLocation)
	}
	if vector.XMLRoot != "stockCheck" || vector.Params["productId"] != "1" || vector.Params["storeId"] != "2" {
		t.Fatalf("vector=%+v", vector)
	}
}
