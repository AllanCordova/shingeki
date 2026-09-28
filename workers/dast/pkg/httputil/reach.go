package httputil

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

func CheckReachable(ctx context.Context, rawURL string) error {
	client := &http.Client{
		Timeout:       15 * time.Second,
		CheckRedirect: CheckSameOriginRedirect,
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return fmt.Errorf("target unreachable: %w", err)
	}
	req.Header.Set("Accept", "*/*")
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("target unreachable: %w", err)
	}
	_ = res.Body.Close()
	return nil
}
