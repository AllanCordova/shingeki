package dynamic

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/discovery/bfs"
)

func TestExploreStateStopsWhenIdle(t *testing.T) {
	queue := bfs.NewQueue()
	state := newExploreState(queue)
	_, ok, stop := state.next(10)
	if ok || !stop {
		t.Fatalf("empty queue should stop, ok=%v stop=%v", ok, stop)
	}
}

func TestExploreStateKeepsSiblingWorkVisible(t *testing.T) {
	queue := bfs.NewQueue()
	queue.Enqueue("https://app.example/", 0)
	state := newExploreState(queue)

	item, ok, stop := state.next(10)
	if !ok || stop || item.URL != "https://app.example/" {
		t.Fatalf("first item = %+v ok=%v stop=%v", item, ok, stop)
	}
	_, ok, stop = state.next(10)
	if ok || stop {
		t.Fatalf("sibling should wait while the first page is in flight, ok=%v stop=%v", ok, stop)
	}
	state.enqueue("https://app.example/next", 1)
	state.finish(true)
	next, ok, stop := state.next(10)
	if !ok || stop || next.URL != "https://app.example/next" {
		t.Fatalf("follow-up = %+v ok=%v stop=%v", next, ok, stop)
	}
}

func TestExploreStatePageBudget(t *testing.T) {
	queue := bfs.NewQueue()
	queue.Enqueue("https://app.example/a", 0)
	queue.Enqueue("https://app.example/b", 0)
	state := newExploreState(queue)
	if _, ok, _ := state.next(1); !ok {
		t.Fatal("expected the first page")
	}
	state.finish(true)
	if _, ok, stop := state.next(1); ok || !stop {
		t.Fatalf("page budget should stop, ok=%v stop=%v", ok, stop)
	}
}
