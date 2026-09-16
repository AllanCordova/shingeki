package evidence

import (
	"context"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

type JWTValidator struct{}

func NewJWTValidator() *JWTValidator {
	return &JWTValidator{}
}

func (v *JWTValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "JWT") {
		return nil
	}
	if !successStatus(response.AttackStatus) {
		return nil
	}
	if response.BaselineStatus < 400 {
		return nil
	}
	if !looksLikePrivilegedAuthBody(response.AttackBody) {
		return nil
	}
	return newFinding(response, "forged alg=none JWT accessed an authenticated resource that rejected a broken signature")
}

func looksLikePrivilegedAuthBody(body string) bool {
	lower := strings.ToLower(body)
	if strings.Contains(lower, `"email"`) && (strings.Contains(lower, `"role"`) || strings.Contains(lower, `"authentication"`)) {
		return true
	}
	return jwtPattern.MatchString(body)
}
