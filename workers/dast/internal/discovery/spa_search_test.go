package discovery

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestAppendSPASearchVectorsAddsHashSearch(t *testing.T) {
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://shop.test/#/", "GET", "URL_PATH"),
		contracts.NewAttackVector("http://shop.test/rest/products/search?q=", "GET", "QUERY_PARAMETER"),
	}
	got := AppendSPASearchVectors("http://shop.test/", vectors)
	if len(got) != 3 {
		t.Fatalf("expected hash search sibling, got %#v", got)
	}
	last := got[len(got)-1]
	if last.TargetLocation != "QUERY_PARAMETER" || last.Route != "http://shop.test/#/search?q=" {
		t.Fatalf("unexpected sibling %#v", last)
	}
	if last.Params["q"] != "" {
		t.Fatalf("expected empty q param, got %#v", last.Params)
	}
}

func TestAppendSPASearchVectorsSkipsWithoutHashRouter(t *testing.T) {
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://shop.test/rest/products/search?q=", "GET", "QUERY_PARAMETER"),
	}
	got := AppendSPASearchVectors("http://shop.test/", vectors)
	if len(got) != 1 {
		t.Fatalf("must not invent hash search without a hash router, got %#v", got)
	}
}

func TestAppendSPASearchVectorsIdempotent(t *testing.T) {
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://shop.test/#/", "GET", "URL_PATH"),
		contracts.NewAttackVector("http://shop.test/rest/products/search?q=", "GET", "QUERY_PARAMETER"),
		func() contracts.AttackVector {
			v := contracts.NewAttackVector("http://shop.test/#/search?q=", "GET", "QUERY_PARAMETER")
			v.Params["q"] = ""
			return v
		}(),
	}
	got := AppendSPASearchVectors("http://shop.test/", vectors)
	if len(got) != 3 {
		t.Fatalf("expected no duplicate, got %#v", got)
	}
}
