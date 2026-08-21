package static

import (
	"testing"
)

func TestFormVectorClassifiesGetAsQueryParameter(t *testing.T) {
	vector, ok := formVector("http://127.0.0.1:8090/search.php", "GET", map[string]string{"q": ""})
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
}

func TestFormVectorKeepsPostAsForm(t *testing.T) {
	vector, ok := formVector("http://127.0.0.1:8090/login.php", "POST", map[string]string{
		"email":    "guest@vuln.local",
		"password": "guest123",
	})
	if !ok {
		t.Fatal("expected vector")
	}
	if vector.TargetLocation != "FORM" {
		t.Fatalf("location=%s", vector.TargetLocation)
	}
	if vector.Method != "POST" {
		t.Fatalf("method=%s", vector.Method)
	}
}
