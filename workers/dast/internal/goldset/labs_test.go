package goldset

import (
	"context"
	"net/http/httptest"
	"testing"
)

func TestEvaluateLabsFindsPublicClasses(t *testing.T) {
	server := httptest.NewServer(LabsHandler())
	defer server.Close()

	report, err := executeJobs(context.Background(), server.URL, LabJobs(server.URL), ExpectedLabChallenges(), ClassifyLab)
	if err != nil {
		t.Fatal(err)
	}
	if missing := report.Missing(); len(missing) > 0 {
		t.Fatalf("missing %v hits=%v unexpected=%v", missing, report.Hits, report.Unexpected)
	}
}
