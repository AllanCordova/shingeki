package evidence

import (
	"context"
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

type RedirectValidator struct{}

func NewRedirectValidator() *RedirectValidator {
	return &RedirectValidator{}
}

func (v *RedirectValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "REDIRECT") {
		return nil
	}
	if response.AttackStatus < 300 || response.AttackStatus >= 400 {
		return nil
	}
	location := strings.TrimSpace(response.AttackLocation)
	if location == "" {
		return nil
	}
	parsed, err := url.Parse(location)
	if err != nil || parsed.Host == "" {
		return nil
	}
	originHost := requestHost(response.Job.Vector.Route)
	if originHost == "" || strings.EqualFold(parsed.Host, originHost) {
		return nil
	}
	return newFinding(response, "off-origin Location header followed the injected redirect payload")
}

func requestHost(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return ""
	}
	return parsed.Host
}
