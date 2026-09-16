package dynamic

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestQueryVectorFromPageURLReadsHashQuery(t *testing.T) {
	vector, ok := queryVectorFromPageURL("http://shop.test/#/search?q=apple")
	if !ok {
		t.Fatal("expected hash query vector")
	}
	if vector.TargetLocation != "QUERY_PARAMETER" {
		t.Fatalf("location=%s", vector.TargetLocation)
	}
	if vector.Params["q"] != "apple" {
		t.Fatalf("params=%v", vector.Params)
	}
}

func TestQueryVectorFromPageURLRequiresParams(t *testing.T) {
	if _, ok := queryVectorFromPageURL("http://shop.test/#/"); ok {
		t.Fatal("bare hash root is not a query vector")
	}
}

func TestHashSearchVector(t *testing.T) {
	vector, ok := hashSearchVector("http://shop.test/")
	if !ok {
		t.Fatal("expected hash search vector")
	}
	want := contracts.NewAttackVector("http://shop.test/#/search?q=", "GET", "QUERY_PARAMETER")
	if vector.Route != want.Route || vector.TargetLocation != want.TargetLocation {
		t.Fatalf("got %#v", vector)
	}
	if vector.Params["q"] != "" {
		t.Fatalf("params=%v", vector.Params)
	}
}
