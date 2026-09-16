package discovery

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestAppendSPALoginVectorsAddsJSONLogin(t *testing.T) {
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://shop.test/#/", "GET", "URL_PATH"),
		contracts.NewAttackVector("http://shop.test/rest/products/search?q=", "GET", "QUERY_PARAMETER"),
	}
	got := AppendSPALoginVectors("http://shop.test/", vectors)
	if len(got) != 3 {
		t.Fatalf("expected JSON login sibling, got %#v", got)
	}
	last := got[len(got)-1]
	if last.Method != "POST" || last.TargetLocation != "JSON_BODY" {
		t.Fatalf("unexpected login vector %#v", last)
	}
	if last.Route != "http://shop.test/rest/user/login" {
		t.Fatalf("route=%s", last.Route)
	}
	if _, ok := last.Params["email"]; !ok {
		t.Fatalf("expected email param, got %#v", last.Params)
	}
}

func TestAppendSPALoginVectorsSkipsWhenLoginExists(t *testing.T) {
	existing := contracts.NewAttackVector("http://shop.test/rest/user/login", "POST", "JSON_BODY")
	existing.Params["email"] = ""
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://shop.test/#/", "GET", "URL_PATH"),
		existing,
	}
	got := AppendSPALoginVectors("http://shop.test/", vectors)
	if len(got) != 2 {
		t.Fatalf("expected no duplicate login, got %#v", got)
	}
}

func TestAppendSPALoginVectorsSkipsPHPLab(t *testing.T) {
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector("http://lab.test/login.php", "POST", "FORM"),
	}
	got := AppendSPALoginVectors("http://lab.test/", vectors)
	if len(got) != 1 {
		t.Fatalf("must not invent REST login on PHP lab, got %#v", got)
	}
}
