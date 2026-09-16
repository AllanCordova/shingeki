package discovery

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestAppendSPACoverageVectorsAddsRedirectFTPUpload(t *testing.T) {
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://shop.test/#/", "GET", "URL_PATH"),
		contracts.NewAttackVector("http://shop.test/rest/products/search?q=", "GET", "QUERY_PARAMETER"),
	}
	got := AppendSPACoverageVectors("http://shop.test/", vectors)
	if len(got) != 5 {
		t.Fatalf("expected redirect+ftp+upload, got %#v", got)
	}
}

func TestAppendSPACoverageVectorsSkipsPHPLab(t *testing.T) {
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://lab.test/login.php", "POST", "FORM"),
	}
	got := AppendSPACoverageVectors("http://lab.test/", vectors)
	if len(got) != 1 {
		t.Fatalf("must not invent Juice Shop coverage routes on PHP lab, got %#v", got)
	}
}
