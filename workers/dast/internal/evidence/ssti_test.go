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

func TestSSTIRequiresSecondExpression(t *testing.T) {
	var seen string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		seen = r.URL.RawQuery + " " + string(raw)
		if strings.Contains(seen, "47%2A53") || strings.Contains(seen, "47*53") {
			_, _ = w.Write([]byte("<p>2491</p>"))
			return
		}
		_, _ = w.Write([]byte("<p>49</p>"))
	}))
	defer server.Close()

	finding := NewSSTIValidator().Analyze(context.Background(), sstiResponse(server.URL, "{{7*7}}", "<p>hi</p>", "<p>49</p>"))
	if finding == nil {
		t.Fatal("expected confirmed SSTI")
	}
	if !strings.Contains(seen, "47") {
		t.Fatalf("sibling probe was not sent: %s", seen)
	}
}

func TestSSTIIgnoresReflectedExpressionAndStray49(t *testing.T) {
	validator := NewSSTIValidator()
	body := `<p>&lt;%= 7*7 %&gt;</p><span>49</span>`
	if finding := validator.Analyze(context.Background(), sstiResponse("http://127.0.0.1:1", "<%= 7*7 %>", "<p>hi</p>", body)); finding != nil {
		t.Fatalf("reflected expression must not confirm: %s", finding.Evidence)
	}
	if finding := validator.Analyze(context.Background(), sstiResponse("http://127.0.0.1:1", "{{config}}", "<p>hi</p>", "<p>49</p>")); finding != nil {
		t.Fatalf("non-arithmetic payload must not confirm from 49: %s", finding.Evidence)
	}
	if finding := validator.Analyze(context.Background(), sstiResponse("http://127.0.0.1:1", "{{7*7}}", "<p>hi</p>", "<p>1492</p>")); finding != nil {
		t.Fatalf("49 inside a larger number must not confirm: %s", finding.Evidence)
	}
}

func TestSSTIRejectsUnrelatedSecondResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("<p>still 49</p>"))
	}))
	defer server.Close()
	if finding := NewSSTIValidator().Analyze(context.Background(), sstiResponse(server.URL, "{{7*7}}", "<p>hi</p>", "<p>49</p>")); finding != nil {
		t.Fatalf("sibling without the second product must not confirm: %s", finding.Evidence)
	}
}

func sstiResponse(route, payload, baseline, attack string) types.Response {
	return types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "SSTI", TargetLocation: "QUERY_PARAMETER"},
			Vector: contracts.AttackVector{
				Route:  route + "/search",
				Params: map[string]string{"q": "hi"},
			},
			ParamKey: "q",
			Payload:  types.PayloadSpec{Value: payload},
		},
		BaselineStatus: 200,
		AttackStatus:   200,
		BaselineBody:   baseline,
		AttackBody:     attack,
		PayloadUsed:    payload,
	}
}
