package evidence

import (
	"context"
	"io"
	"net/http"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/injectors"
)

const probeBodyCap = 64 * 1024

func sendSpec(ctx context.Context, client *http.Client, spec injectors.RequestSpec) (int, string, error) {
	if client == nil {
		client = http.DefaultClient
	}
	method := strings.TrimSpace(spec.Method)
	if method == "" {
		method = http.MethodGet
	}
	var body io.Reader
	if spec.Body != "" {
		body = strings.NewReader(spec.Body)
	}
	req, err := http.NewRequestWithContext(ctx, method, spec.URL, body)
	if err != nil {
		return 0, "", err
	}
	for key, value := range spec.Headers {
		req.Header.Set(key, value)
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, probeBodyCap))
	if err != nil {
		return resp.StatusCode, "", err
	}
	return resp.StatusCode, string(raw), nil
}
