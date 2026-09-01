package bfs

import (
	"container/heap"
	"net/url"
	"sort"
	"strings"
)

type Queue struct {
	items itemHeap
	seen  map[string]struct{}
}

type Item struct {
	URL   string
	Depth int
	Score int
	index int
}

func NewQueue() *Queue {
	q := &Queue{
		seen: make(map[string]struct{}),
	}
	heap.Init(&q.items)
	return q
}

func (q *Queue) Enqueue(rawURL string, depth int) bool {
	normalized, ok := NormalizeURL(rawURL)
	if !ok {
		return false
	}
	if _, exists := q.seen[normalized]; exists {
		return false
	}
	q.seen[normalized] = struct{}{}
	heap.Push(&q.items, Item{
		URL:   rawURL,
		Depth: depth,
		Score: ScoreURL(rawURL),
	})
	return true
}

func (q *Queue) Dequeue() (Item, bool) {
	if q.items.Len() == 0 {
		return Item{}, false
	}
	item, ok := heap.Pop(&q.items).(Item)
	if !ok {
		return Item{}, false
	}
	return item, true
}

func (q *Queue) Len() int {
	return q.items.Len()
}

func (q *Queue) SeenCount() int {
	return len(q.seen)
}

type itemHeap []Item

func (h itemHeap) Len() int { return len(h) }

func (h itemHeap) Less(i, j int) bool {
	if h[i].Score != h[j].Score {
		return h[i].Score > h[j].Score
	}
	if h[i].Depth != h[j].Depth {
		return h[i].Depth < h[j].Depth
	}
	return h[i].URL < h[j].URL
}

func (h itemHeap) Swap(i, j int) {
	h[i], h[j] = h[j], h[i]
	h[i].index = i
	h[j].index = j
}

func (h *itemHeap) Push(x any) {
	item := x.(Item)
	item.index = len(*h)
	*h = append(*h, item)
}

func (h *itemHeap) Pop() any {
	old := *h
	n := len(old)
	item := old[n-1]
	old[n-1] = Item{}
	*h = old[0 : n-1]
	return item
}

func NormalizeURL(raw string) (string, bool) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", false
	}
	parsed.Fragment = ""
	parsed.Scheme = strings.ToLower(parsed.Scheme)
	parsed.Host = strings.ToLower(parsed.Host)

	if parsed.RawQuery != "" {
		values := parsed.Query()
		keys := make([]string, 0, len(values))
		for k := range values {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		query := url.Values{}
		for _, k := range keys {
			vals := values[k]
			sort.Strings(vals)
			for _, v := range vals {
				query.Add(k, v)
			}
		}
		parsed.RawQuery = query.Encode()
	}

	return parsed.String(), true
}

func SameOrigin(base, candidate string) bool {
	baseURL, err := url.Parse(base)
	if err != nil {
		return false
	}
	candidateURL, err := url.Parse(candidate)
	if err != nil {
		return false
	}
	if !strings.EqualFold(baseURL.Scheme, candidateURL.Scheme) {
		return false
	}
	return hostsEquivalent(baseURL.Hostname(), candidateURL.Hostname())
}

func hostsEquivalent(a, b string) bool {
	a = stripWWW(strings.ToLower(strings.TrimSpace(a)))
	b = stripWWW(strings.ToLower(strings.TrimSpace(b)))
	if a == "" || b == "" {
		return false
	}
	if a == b {
		return true
	}
	return strings.HasSuffix(a, "."+b) || strings.HasSuffix(b, "."+a)
}

func stripWWW(host string) string {
	return strings.TrimPrefix(host, "www.")
}

func IsSkippableAsset(rawURL string) bool {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return true
	}
	path := strings.ToLower(parsed.Path)
	switch {
	case strings.HasSuffix(path, ".jpg"),
		strings.HasSuffix(path, ".jpeg"),
		strings.HasSuffix(path, ".png"),
		strings.HasSuffix(path, ".gif"),
		strings.HasSuffix(path, ".webp"),
		strings.HasSuffix(path, ".svg"),
		strings.HasSuffix(path, ".ico"),
		strings.HasSuffix(path, ".css"),
		strings.HasSuffix(path, ".js"),
		strings.HasSuffix(path, ".map"),
		strings.HasSuffix(path, ".woff"),
		strings.HasSuffix(path, ".woff2"),
		strings.HasSuffix(path, ".ttf"),
		strings.HasSuffix(path, ".eot"),
		strings.HasSuffix(path, ".mp4"),
		strings.HasSuffix(path, ".webm"),
		strings.HasSuffix(path, ".pdf"),
		strings.HasSuffix(path, ".zip"):
		return true
	default:
		return false
	}
}

func ResolveReference(baseURL, ref string) (string, bool) {
	base, err := url.Parse(baseURL)
	if err != nil {
		return "", false
	}
	parsed, err := url.Parse(ref)
	if err != nil {
		return "", false
	}
	resolved := base.ResolveReference(parsed)
	if resolved.Scheme == "" || resolved.Host == "" {
		return "", false
	}
	resolved.Fragment = ""
	return resolved.String(), true
}
