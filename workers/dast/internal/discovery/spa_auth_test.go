package discovery

import (
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestAppendSPAAuthenticatedVectorsAddsBasketUsersReviews(t *testing.T) {
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://shop.test/#/", "GET", "URL_PATH"),
		contracts.NewAttackVector("http://shop.test/rest/products/search?q=", "GET", "QUERY_PARAMETER"),
	}
	auth := &contracts.TargetAuth{Headers: map[string]string{"Authorization": "Bearer tok"}}
	got := AppendSPAAuthenticatedVectors("http://shop.test/", vectors, auth)
	if len(got) != 5 {
		t.Fatalf("expected 3 authenticated siblings, got %#v", got)
	}
	last := got[len(got)-1]
	if last.Method != "PUT" || last.TargetLocation != "JSON_BODY" {
		t.Fatalf("expected review PUT, got %#v", last)
	}
}

func TestAppendSPAAuthenticatedVectorsSkipsWithoutAuth(t *testing.T) {
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://shop.test/rest/products/search?q=", "GET", "QUERY_PARAMETER"),
	}
	got := AppendSPAAuthenticatedVectors("http://shop.test/", vectors, nil)
	if len(got) != 1 {
		t.Fatalf("must not seed authenticated routes without a session, got %#v", got)
	}
}

func TestAppendSPAAuthenticatedVectorsSeedsWhenCrawlHasJunkIDs(t *testing.T) {
	nan := contracts.NewAttackVector("http://shop.test/rest/basket/NaN", "GET", "URL_PATH")
	zero := contracts.NewAttackVector("http://shop.test/rest/basket/0", "GET", "JSON_BODY")
	zero.Body = `{"input":"2"}`
	reviewsGET := contracts.NewAttackVector("http://shop.test/rest/products/6/reviews", "GET", "JSON_BODY")
	reviewsGET.Body = `{"input":""}`
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://shop.test/rest/products/search?q=", "GET", "QUERY_PARAMETER"),
		nan,
		zero,
		reviewsGET,
	}
	auth := &contracts.TargetAuth{Headers: map[string]string{"Authorization": "Bearer tok"}}
	got := AppendSPAAuthenticatedVectors("http://shop.test/", vectors, auth)

	hasBasket1, hasReviewPUT := false, false
	for _, vector := range got {
		if strings.Contains(vector.Route, "/rest/basket/1") && vector.TargetLocation == "URL_PATH" {
			hasBasket1 = true
		}
		if vector.Method == "PUT" && strings.Contains(vector.Route, "/rest/products/1/reviews") {
			if _, ok := vector.Params["author"]; ok {
				hasReviewPUT = true
			}
		}
	}
	if !hasBasket1 {
		t.Fatalf("NaN/0 basket must still seed /rest/basket/1, got %#v", got)
	}
	if !hasReviewPUT {
		t.Fatalf("GET reviews JSON must still seed PUT author, got %#v", got)
	}
}

func TestAppendSPAAuthenticatedVectorsSkipsPHPLab(t *testing.T) {
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://lab.test/login.php", "POST", "FORM"),
	}
	auth := &contracts.TargetAuth{Headers: map[string]string{"Authorization": "Bearer tok"}}
	got := AppendSPAAuthenticatedVectors("http://lab.test/", vectors, auth)
	if len(got) != 1 {
		t.Fatalf("must not invent Juice Shop routes on PHP lab, got %#v", got)
	}
}
