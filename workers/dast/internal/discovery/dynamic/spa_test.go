package dynamic

import (
	"testing"
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
