package goldset

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
)

const (
	ChallengeDOMXSS = "dom-xss-hash"
	domXSSPayload   = `<img src=x onerror=alert(1)>`
)

func DOMXSSHandler(patched bool) http.Handler {
	sink := "document.body.innerHTML = q;"
	if patched {
		sink = "document.body.textContent = q;"
	}
	page := `<!doctype html><html><body><script>
var raw = location.hash || "";
var q = "";
var mark = raw.indexOf("q=");
if (mark >= 0) q = decodeURIComponent(raw.slice(mark + 2).split("&")[0].replace(/\+/g, " "));
` + sink + `
</script></body></html>`
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(page))
	})
}

func FindChrome() string {
	if path := strings.TrimSpace(os.Getenv("CHROME_PATH")); path != "" {
		return path
	}
	for _, name := range []string{"chromium", "chromium-browser", "google-chrome", "google-chrome-stable"} {
		path, err := exec.LookPath(name)
		if err == nil {
			return path
		}
	}
	return ""
}

func EvaluateDOMXSS(ctx context.Context, origin string) (bool, error) {
	cfg := harnessConfig()
	cfg.Discovery.RodEnabled = true
	cfg.Discovery.RodHeadless = true
	cfg.Discovery.RodNoSandbox = true
	cfg.Discovery.ChromePath = FindChrome()
	cfg.Discovery.BrowserLaunchTimeout = 90 * time.Second
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	engine := attack.NewRestyEngine(cfg.Attack, logger)
	validator := evidence.NewDOMXSSValidator(cfg.Discovery, logger)
	defer func() { _ = validator.Close() }()

	route := strings.TrimRight(origin, "/") + "/#/search?q="
	vector := contracts.NewAttackVector(route, http.MethodGet, "QUERY_PARAMETER")
	vector.Params["q"] = "a"
	job := types.Job{
		Attack: contracts.AttackItem{
			AttackID:       "xss-dom",
			Category:       "XSS",
			TargetLocation: "QUERY_PARAMETER",
		},
		Vector:   vector,
		ParamKey: "q",
		Payload:  types.PayloadSpec{Value: domXSSPayload, Field: "q"},
	}
	responses := engine.ExecutePool(ctx, []types.Job{job})
	if len(responses) != 1 {
		return false, nil
	}
	finding := validator.Analyze(ctx, responses[0])
	return finding != nil, nil
}
