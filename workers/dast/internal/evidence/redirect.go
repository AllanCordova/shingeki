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
	if finding := headerRedirect(response); finding != nil {
		return finding
	}
	return bodyRedirect(response)
}

func headerRedirect(response types.Response) *Finding {
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

func bodyRedirect(response types.Response) *Finding {
	if response.AttackStatus == 0 || response.AttackStatus >= 400 {
		return nil
	}
	host := payloadHost(response.PayloadUsed)
	if host == "" || strings.EqualFold(host, requestHost(response.Job.Vector.Route)) {
		return nil
	}
	if !redirectSinkContains(response.AttackBody, host) || redirectSinkContains(response.BaselineBody, host) {
		return nil
	}
	return newFinding(response, "response body sent the browser to the injected redirect host")
}

func payloadHost(payload string) string {
	parsed, err := url.Parse(strings.TrimSpace(payload))
	if err != nil {
		return ""
	}
	return parsed.Hostname()
}

func redirectSinkContains(body, host string) bool {
	if body == "" || host == "" {
		return false
	}
	collapsed := strings.ToLower(strings.ReplaceAll(body, " ", ""))
	host = strings.ToLower(host)
	needles := []string{
		`href="http://` + host,
		`href="https://` + host,
		`href='http://` + host,
		`href='https://` + host,
		`href="//` + host,
		`url=http://` + host,
		`url=https://` + host,
		`url=//` + host,
		`location.href="http://` + host,
		`location.href="https://` + host,
		`location.href='http://` + host,
		`location.href='https://` + host,
		`location.href="//` + host,
		`location.replace("http://` + host,
		`location.replace("https://` + host,
		`location.replace("//` + host,
		`window.location="http://` + host,
		`window.location="https://` + host,
		`window.location="//` + host,
	}
	for _, needle := range needles {
		if strings.Contains(collapsed, needle) {
			return true
		}
	}
	return false
}

func requestHost(raw string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return ""
	}
	return parsed.Host
}
