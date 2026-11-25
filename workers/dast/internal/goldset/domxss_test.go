package goldset

import (
	"context"
	"net/http/httptest"
	"testing"
)

func TestEvaluateDOMXSSConfirmsHashSink(t *testing.T) {
	if FindChrome() == "" {
		t.Skip("chromium is not installed")
	}
	server := httptest.NewServer(DOMXSSHandler(false))
	defer server.Close()

	hit, err := EvaluateDOMXSS(context.Background(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if !hit {
		t.Fatal("hash innerHTML sink should confirm DOM XSS")
	}
}

func TestEvaluateDOMXSSMissesWhenPatched(t *testing.T) {
	if FindChrome() == "" {
		t.Skip("chromium is not installed")
	}
	server := httptest.NewServer(DOMXSSHandler(true))
	defer server.Close()

	hit, err := EvaluateDOMXSS(context.Background(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if hit {
		t.Fatal("text sink must not confirm DOM XSS")
	}
}
