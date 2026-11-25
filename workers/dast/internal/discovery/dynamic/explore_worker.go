package dynamic

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/go-rod/rod"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery/bfs"
)

const maxClicksPerPage = 4

type exploreState struct {
	mu        sync.Mutex
	queue     *bfs.Queue
	inflight  int
	pages     int
	clicks    int
	forms     int
	clicked   map[string]struct{}
	submitted map[string]struct{}
}

func newExploreState(queue *bfs.Queue) *exploreState {
	return &exploreState{
		queue:     queue,
		clicked:   map[string]struct{}{},
		submitted: map[string]struct{}{},
	}
}

func (s *exploreState) enqueue(rawURL string, depth int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.queue.Enqueue(rawURL, depth)
}

// next reserves one queued URL. stop is true when the page budget is spent
// or no worker is still discovering links.
func (s *exploreState) next(maxPages int) (bfs.Item, bool, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.pages >= maxPages {
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

func (s *exploreState) finish(visited bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if visited {
		s.pages++
	}
	if s.inflight > 0 {
		s.inflight--
	}
}

func (s *exploreState) claimClick(key string, max int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.clicks >= max {
		return false
	}
	if _, done := s.clicked[key]; done {
		return false
	}
	s.clicked[key] = struct{}{}
	s.clicks++
	return true
}

func (s *exploreState) claimForm(key string, max int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.forms >= max {
		return false
	}
	if _, done := s.submitted[key]; done {
		return false
	}
	s.submitted[key] = struct{}{}
	s.forms++
	return true
}

func (s *exploreState) counts() (pages, clicks int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.pages, s.clicks
}

func (r *RodCrawler) exploreWorker(
	ctx context.Context,
	page *rod.Page,
	targetURL string,
	hasSession bool,
	state *exploreState,
	record func(contracts.AttackVector),
	maxPages, maxClicks, maxForms int,
) {
	for {
		if ctx.Err() != nil {
			return
		}
		item, ok, stop := state.next(maxPages)
		if stop {
			return
		}
		if !ok {
			select {
			case <-ctx.Done():
				return
			case <-time.After(40 * time.Millisecond):
			}
			continue
		}
		if item.Depth > r.cfg.MaxDepth {
			state.finish(false)
			continue
		}
		visited := r.exploreItem(ctx, page, item, targetURL, hasSession, state, record, maxClicks, maxForms)
		state.finish(visited)
	}
}

func (r *RodCrawler) exploreItem(
	ctx context.Context,
	page *rod.Page,
	item bfs.Item,
	targetURL string,
	hasSession bool,
	state *exploreState,
	record func(contracts.AttackVector),
	maxClicks, maxForms int,
) bool {
	if err := r.openPage(ctx, page, item.URL); err != nil {
		if ctx.Err() == nil {
			r.logger.Warn("navigate failed", "url", item.URL, "error", err)
		}
		return false
	}
	r.settle(ctx)

	currentURL := pageURL(page)
	if currentURL == "" {
		return false
	}
	if looksLikeLoginURL(currentURL) && hasSession {
		r.logger.Warn("page looks like login; scanner session may have been rejected",
			"seed", item.URL,
			"landed", currentURL,
		)
		record(contracts.NewAttackVector(currentURL, "GET", "URL_PATH"))
		return false
	}
	if !bfs.IsAttackableDiscoveryURL(targetURL, currentURL) {
		return false
	}

	record(contracts.NewAttackVector(currentURL, "GET", "URL_PATH"))
	if vector, ok := queryVectorFromPageURL(currentURL); ok {
		record(vector)
	}

	for _, link := range r.collectLinks(ctx, page, currentURL) {
		if bfs.IsAttackableDiscoveryURL(targetURL, link) {
			state.enqueue(link, item.Depth+1)
			if vector, ok := queryVectorFromPageURL(link); ok {
				record(vector)
			}
		}
	}

	forms, err := r.collectForms(ctx, page)
	if err != nil {
		r.logger.Warn("collect forms failed", "url", currentURL, "error", err)
	} else {
		for _, form := range forms {
			if vector, ok := vectorFromForm(currentURL, form); ok {
				record(vector)
			}
		}
	}

	candidates, err := r.collectClickables(ctx, page, currentURL)
	if err != nil {
		r.logger.Warn("collect clickables failed", "url", currentURL, "error", err)
	} else {
		pageClicks := 0
		for _, candidate := range candidates {
			if ctx.Err() != nil || pageClicks >= maxClicksPerPage {
				break
			}
			if !state.claimClick(candidate.Key, maxClicks) {
				if !state.clicksLeft(maxClicks) {
					break
				}
				continue
			}
			pageClicks++

			if href := strings.TrimSpace(candidate.Href); href != "" && !hasPrefixFold(href, "#") {
				if resolved, ok := bfs.ResolveReference(currentURL, href); ok {
					if bfs.IsAttackableDiscoveryURL(targetURL, resolved) {
						state.enqueue(resolved, item.Depth+1)
					}
				}
			}

			if err := r.clickCandidate(ctx, page, candidate); err != nil {
				r.logger.Warn("click failed", "text", candidate.Text, "href", candidate.Href, "error", err)
				if ctx.Err() != nil {
					break
				}
				_ = r.openPage(ctx, page, currentURL)
				r.settle(ctx)
				continue
			}
			r.settle(ctx)

			afterURL := pageURL(page)
			if afterURL == "" {
				continue
			}
			if looksLikeLoginURL(afterURL) && hasSession {
				r.logger.Warn("click reached login page; returning to previous page",
					"from", currentURL,
					"to", afterURL,
				)
				record(contracts.NewAttackVector(afterURL, "GET", "URL_PATH"))
				if err := r.openPage(ctx, page, currentURL); err != nil && ctx.Err() != nil {
					break
				}
				r.settle(ctx)
				continue
			}
			if bfs.IsAttackableDiscoveryURL(targetURL, afterURL) {
				state.enqueue(afterURL, item.Depth+1)
			}
			if afterURL != currentURL {
				if err := r.openPage(ctx, page, currentURL); err != nil && ctx.Err() != nil {
					break
				}
				r.settle(ctx)
			}
		}
	}

	forms, err = r.collectForms(ctx, page)
	if err != nil {
		r.logger.Warn("collect forms failed", "url", currentURL, "error", err)
		return true
	}
	for _, form := range forms {
		if ctx.Err() != nil {
			break
		}
		if shouldSkipForm(form, hasSession) {
			continue
		}
		if !state.claimForm(formKey(form), maxForms) {
			if !state.formsLeft(maxForms) {
				break
			}
			continue
		}
		if err := r.submitForm(ctx, page, form); err != nil {
			r.logger.Warn("form submit failed", "action", form.Action, "error", err)
			if ctx.Err() != nil {
				break
			}
		}
		r.settle(ctx)
		afterURL := pageURL(page)
		if afterURL != "" && bfs.IsAttackableDiscoveryURL(targetURL, afterURL) {
			state.enqueue(afterURL, item.Depth+1)
		}
		if afterURL != currentURL {
			if err := r.openPage(ctx, page, currentURL); err != nil && ctx.Err() != nil {
				break
			}
			r.settle(ctx)
		}
	}
	return true
}

func (s *exploreState) clicksLeft(max int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.clicks < max
}

func (s *exploreState) formsLeft(max int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.forms < max
}
