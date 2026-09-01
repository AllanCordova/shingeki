package bfs_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/discovery/bfs"
)

func TestNormalizeURLDedup(t *testing.T) {
	q := bfs.NewQueue()
	first := q.Enqueue("https://Example.com/path?b=2&a=1", 0)
	second := q.Enqueue("https://example.com/path?a=1&b=2", 1)
	if !first || second {
		t.Fatalf("expected first enqueue true and second false")
	}
	if q.SeenCount() != 1 {
		t.Fatalf("expected seen count 1, got %d", q.SeenCount())
	}
}

func TestSameOrigin(t *testing.T) {
	if !bfs.SameOrigin("https://a.com/x", "https://a.com/y") {
		t.Fatal("expected same origin")
	}
	if bfs.SameOrigin("https://a.com", "https://b.com") {
		t.Fatal("expected different origin")
	}
	if !bfs.SameOrigin("https://www.bling.com.br/produtos.php", "https://bling.com.br/inscricao") {
		t.Fatal("expected www and apex to match")
	}
	if !bfs.SameOrigin("https://bling.com.br/", "https://www.bling.com.br/inicio") {
		t.Fatal("expected apex and www to match")
	}
	if bfs.SameOrigin("https://a.com", "http://a.com") {
		t.Fatal("expected different scheme to be different origin")
	}
	if !bfs.SameOrigin("https://www.example.com/", "https://api.example.com/v1") {
		t.Fatal("expected api subdomain to match apex")
	}
}
