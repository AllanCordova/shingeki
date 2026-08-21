package dynamic

import (
	"net/http"
	"testing"
)

func TestClassifyTargetLocation(t *testing.T) {
	tests := []struct {
		method      string
		contentType string
		want        string
	}{
		{http.MethodGet, "", "QUERY_PARAMETER"},
		{http.MethodPost, "application/json", "JSON_BODY"},
		{http.MethodPost, "application/x-www-form-urlencoded", "FORM"},
		{http.MethodPost, "multipart/form-data; boundary=x", "FORM"},
		{http.MethodPost, "", "API_ENDPOINT"},
	}
	for _, tt := range tests {
		if got := classifyTargetLocation(tt.method, tt.contentType); got != tt.want {
			t.Fatalf("%s %q: got %s want %s", tt.method, tt.contentType, got, tt.want)
		}
	}
}
