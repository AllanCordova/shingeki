package goldset

import (
	"context"
	"net/http/httptest"
	"testing"
)

func TestEvaluateAccessFindsBOLAAdminMassTenant(t *testing.T) {
	server := httptest.NewServer(AccessHandler())
	defer server.Close()

	report, err := EvaluateAccess(context.Background(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if missing := report.Missing(); len(missing) > 0 {
		t.Fatalf("missing %v hits=%v unexpected=%v", missing, report.Hits, report.Unexpected)
	}
}

func TestEvaluateAccessMissesWhenPatched(t *testing.T) {
	server := httptest.NewServer(PatchedAccessHandler())
	defer server.Close()

	report, err := EvaluateAccess(context.Background(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if len(report.Hits) != 0 {
		t.Fatalf("patched access fixture must be clean, hits=%v unexpected=%v", report.Hits, report.Unexpected)
	}
}

func TestClassifyAccess(t *testing.T) {
	if ClassifyAccess("http://app/api/admin/users/", "IDOR") != ChallengeAdminUnauth {
		t.Fatal("admin")
	}
	if ClassifyAccess("http://app/api/orders/ord_alice", "IDOR") != ChallengeOrderBOLA {
		t.Fatal("order")
	}
	if ClassifyAccess("http://app/api/profile", "IDOR") != ChallengeMassAssignment {
		t.Fatal("profile")
	}
	if ClassifyAccess("http://app/api/tenants/tenant-a", "IDOR") != ChallengeTenantIsolation {
		t.Fatal("tenant")
	}
	if ClassifyAccess("http://app/api/login", "SQL_INJECTION") != "" {
		t.Fatal("unknown")
	}
}
