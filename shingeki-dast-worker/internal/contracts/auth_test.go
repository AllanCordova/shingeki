package contracts_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestDispatchBatchAuthHeaders(t *testing.T) {
	batch := contracts.DispatchBatch{
		Auth: &contracts.TargetAuth{
			Type: "cookie",
			Headers: map[string]string{
				"Cookie": "session=abc",
			},
		},
	}

	headers := batch.AuthHeaders()
	if headers["Cookie"] != "session=abc" {
		t.Fatalf("unexpected headers: %+v", headers)
	}
}

func TestMergeHeadersPrefersLocalValues(t *testing.T) {
	merged := contracts.MergeHeaders(
		map[string]string{"Cookie": "global", "Authorization": "Bearer global"},
		map[string]string{"Cookie": "local"},
	)

	if merged["Cookie"] != "local" {
		t.Fatalf("expected local cookie to win, got %q", merged["Cookie"])
	}
	if merged["Authorization"] != "Bearer global" {
		t.Fatalf("expected global authorization, got %q", merged["Authorization"])
	}
}
