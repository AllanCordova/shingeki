package evidence

import (
	"context"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

var ldapErrorNeedles = []string{
	"javax.naming",
	"invalid dn",
	"ldaperror",
	"ldap_search",
	"operations error",
}

type LDAPValidator struct{}

func NewLDAPValidator() *LDAPValidator {
	return &LDAPValidator{}
}

func (v *LDAPValidator) Analyze(_ context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "LDAP") {
		return nil
	}
	body := strings.ToLower(capBody(response.AttackBody))
	base := strings.ToLower(capBody(response.BaselineBody))
	for _, needle := range ldapErrorNeedles {
		if strings.Contains(body, needle) && !strings.Contains(base, needle) {
			return newFinding(response, "LDAP error signature detected in response body")
		}
	}
	return nil
}
