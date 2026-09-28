package mapper

import "strings"

const (
	CategorySQLInjection     = "SQL_INJECTION"
	CategoryXSS              = "XSS"
	CategoryPathTraversal    = "PATH_TRAVERSAL"
	CategoryCommandInjection = "COMMAND_INJECTION"
	CategorySSRF             = "SSRF"
	CategoryXXE              = "XXE"
	CategorySSTI             = "SSTI"
	CategoryOpenRedirect     = "OPEN_REDIRECT"
	CategoryNoSQLInjection   = "NOSQL_INJECTION"
	CategoryLDAPInjection    = "LDAP_INJECTION"
	CategoryJWTConfusion     = "JWT_CONFUSION"
	CategoryCSRF             = "CSRF"
	CategoryIDOR             = "IDOR"
	CategorySupplyChain      = "SUPPLY_CHAIN"
	CategorySecretLeak       = "SECRET_LEAK"
)

type categoryHint struct {
	category string
	needles  []string
}

var checkIDCategoryHints = []categoryHint{
	{CategoryNoSQLInjection, []string{"nosql", "mongo-injection", "mongodb-injection"}},
	{CategorySQLInjection, []string{"sql-injection", "sqli", "tainted-sql", "sql-query", "formatted-sql"}},
	{CategoryXSS, []string{"xss", "echoed-request", "tainted-html", "innerhtml", "dangerouslysetinnerhtml", "rawhtml"}},
	{CategoryPathTraversal, []string{"path-traversal", "tainted-filename", "path-injection", "zip-slip", "arbitrary-file"}},
	{CategoryCommandInjection, []string{"command-injection", "os-command", "shell-injection", "exec-injection", "tainted-exec", "code-injection"}},
	{CategorySSRF, []string{"ssrf", "server-side-request"}},
	{CategoryXXE, []string{"xxe", "xml-external"}},
	{CategorySSTI, []string{"ssti", "template-injection"}},
	{CategoryOpenRedirect, []string{"open-redirect", "openredirect", "unvalidated-redirect"}},
	{CategoryLDAPInjection, []string{"ldap-injection", "ldap-search"}},
	{CategoryJWTConfusion, []string{"jwt", "none-algorithm", "algorithm-confusion"}},
	{CategoryCSRF, []string{"csrf", "cors-misconfig"}},
	{CategoryIDOR, []string{"idor", "broken-access", "mass-assignment", "insecure-direct-object"}},
	{CategorySupplyChain, []string{"github-actions", "mutable-action-tag", "unpinned-action", "third-party-action", "supply-chain"}},
	{CategorySecretLeak, []string{"hardcoded-secret", "detected-secret", "generic-secret", "exposed-secret", "aws-access-key", "stripe", "github-pat", "api-key"}},
}

func CategoryForCheckID(checkID string) string {
	hay := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(checkID), "_", "-"))
	if hay == "" {
		return ""
	}
	for _, hint := range checkIDCategoryHints {
		for _, needle := range hint.needles {
			if strings.Contains(hay, needle) {
				return hint.category
			}
		}
	}
	return ""
}
