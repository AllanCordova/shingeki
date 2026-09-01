package bfs_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/discovery/bfs"
)

func TestScoreURLPrefersInventoryOverBlog(t *testing.T) {
	high := bfs.ScoreURL("https://app.example/estoque/novo")
	low := bfs.ScoreURL("https://app.example/blog/post-antigo")
	if high <= low {
		t.Fatalf("expected /estoque/novo (%d) to outrank /blog/post-antigo (%d)", high, low)
	}
}

func TestScoreURLBoostsIdentifiersAndPenalizesPagination(t *testing.T) {
	withID := bfs.ScoreURL("https://app.example/estoque/item/45")
	plain := bfs.ScoreURL("https://app.example/estoque")
	if withID <= plain {
		t.Fatalf("expected identifier boost: id=%d plain=%d", withID, plain)
	}

	paged := bfs.ScoreURL("https://app.example/estoque?page=99")
	if paged >= plain {
		t.Fatalf("expected pagination penalty: paged=%d plain=%d", paged, plain)
	}

	queryID := bfs.ScoreURL("https://app.example/produtos?id=123")
	if queryID <= bfs.ScoreURL("https://app.example/produtos") {
		t.Fatal("expected query id boost")
	}
}

func TestPriorityQueueDequeuesHighestScoreFirst(t *testing.T) {
	q := bfs.NewQueue()
	if !q.Enqueue("https://app.example/blog/post-antigo", 1) {
		t.Fatal("enqueue blog")
	}
	if !q.Enqueue("https://app.example/estoque/novo", 1) {
		t.Fatal("enqueue estoque")
	}
	if !q.Enqueue("https://app.example/contato", 1) {
		t.Fatal("enqueue contato")
	}

	first, ok := q.Dequeue()
	if !ok {
		t.Fatal("expected first item")
	}
	if first.URL != "https://app.example/estoque/novo" {
		t.Fatalf("expected estoque first, got %s score=%d", first.URL, first.Score)
	}
}
