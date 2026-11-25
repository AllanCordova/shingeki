package static

import (
	"sync"

	"github.com/shingeki/dast-worker/internal/discovery/bfs"
)

type staticCrawl struct {
	mu       sync.Mutex
	queue    *bfs.Queue
	inflight int
	pages    int
}

func newStaticCrawl(queue *bfs.Queue) *staticCrawl {
	return &staticCrawl{queue: queue}
}

func (s *staticCrawl) enqueue(rawURL string, depth int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.queue.Enqueue(rawURL, depth)
}

func (s *staticCrawl) next(maxPages int) (bfs.Item, bool, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if maxPages > 0 && s.pages >= maxPages {
		return bfs.Item{}, false, true
	}
	if s.queue.Len() == 0 {
		return bfs.Item{}, false, s.inflight == 0
	}
	item, ok := s.queue.Dequeue()
	if !ok {
		return bfs.Item{}, false, s.inflight == 0
	}
	s.inflight++
	return item, true, false
}

func (s *staticCrawl) finish(visited bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if visited {
		s.pages++
	}
	if s.inflight > 0 {
		s.inflight--
	}
}

func (s *staticCrawl) counts() (pages, clicks int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.pages, 0
}
