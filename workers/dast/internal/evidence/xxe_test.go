package evidence

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestXXEFileMarkerStillConfirms(t *testing.T) {
	finding := NewXXEValidator().Analyze(context.Background(), xxeResponse("http://127.0.0.1:1", 200, "ok", 200, "root:x:0:0:root"))
	if finding == nil || !strings.Contains(finding.Evidence, "local file") {
		t.Fatalf("file marker should confirm, got %#v", finding)
	}
}

func TestXXEEntityExpansionMatchesLiteralBehavior(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		value := xmlField(string(raw), "productId")
		if entity := internalEntity(string(raw)); entity != "" {
			value = entity
		}
		if value == "1" {
			if strings.Contains(string(raw), "ENTITY") {
				_, _ = w.Write([]byte("417"))
				return
			}
			_, _ = w.Write([]byte("139"))
			return
		}
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("Product ID must be a number"))
	}))
	defer server.Close()

	validator := NewXXEValidator()
	first := validator.Analyze(context.Background(), xxeResponse(server.URL, 200, "139", 400, "Invalid product ID"))
	if first == nil || !strings.Contains(first.Evidence, "expanded a declared entity") {
		t.Fatalf("expected entity expansion, got %#v", first)
	}
	second := validator.Analyze(context.Background(), xxeResponse(server.URL, 200, "139", 400, "Invalid product ID"))
	if second != nil {
		t.Fatal("same route should be reported once")
	}
}

func TestXXEIgnoresParserThatDoesNotUseTheValue(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer server.Close()
	if finding := NewXXEValidator().Analyze(context.Background(), xxeResponse(server.URL, 200, "ok", 200, "ok")); finding != nil {
		t.Fatalf("identical responses must not confirm: %s", finding.Evidence)
	}
}

func TestXXEIgnoresUnexpandedEntity(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		if strings.Contains(string(raw), "ENTITY") {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte("XML parsing error"))
			return
		}
		if xmlField(string(raw), "productId") == "1" {
			_, _ = w.Write([]byte("10"))
			return
		}
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte("Product ID must be a number"))
	}))
	defer server.Close()
	if finding := NewXXEValidator().Analyze(context.Background(), xxeResponse(server.URL, 200, "10", 400, "XML parsing error")); finding != nil {
		t.Fatalf("unexpanded entity must not confirm: %s", finding.Evidence)
	}
}

func xxeResponse(route string, baselineStatus int, baseline string, attackStatus int, attack string) types.Response {
	return types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "XXE", TargetLocation: "XML_BODY"},
			Vector: contracts.AttackVector{
				Route:   route + "/stock",
				Method:  http.MethodPost,
				XMLRoot: "stockCheck",
				Params:  map[string]string{"productId": "1", "storeId": "1"},
			},
			ParamKey: "productId",
			Payload:  types.PayloadSpec{Value: `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>`},
		},
		BaselineStatus: baselineStatus,
		BaselineBody:   baseline,
		AttackStatus:   attackStatus,
		AttackBody:     attack,
		PayloadUsed:    "xxe",
	}
}

func xmlField(body, name string) string {
	open := "<" + name + ">"
	close := "</" + name + ">"
	start := strings.Index(body, open)
	end := strings.Index(body, close)
	if start < 0 || end < start {
		return ""
	}
	return body[start+len(open) : end]
}

func internalEntity(body string) string {
	const marker = `<!ENTITY xxe "`
	start := strings.Index(body, marker)
	if start < 0 {
		return ""
	}
	rest := body[start+len(marker):]
	end := strings.Index(rest, `"`)
	if end < 0 {
		return ""
	}
	return rest[:end]
}
