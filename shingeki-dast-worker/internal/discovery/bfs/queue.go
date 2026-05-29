package bfs

import (
	"net/url"
	"sort"
	"strings"
)

type Queue struct {
	items []Item
	seen  map[string]struct{}
}

type Item struct {
	URL   string
	Depth int
}

func NewQueue() *Queue {
	return &Queue{
		seen: make(map[string]struct{}),
	}
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
	q.items = append(q.items, Item{URL: rawURL, Depth: depth})
	return true
}

func (q *Queue) Dequeue() (Item, bool) {
	if len(q.items) == 0 {
		return Item{}, false
	}
	item := q.items[0]
	q.items = q.items[1:]
	return item, true
}

func (q *Queue) Len() int {
	return len(q.items)
}

func (q *Queue) SeenCount() int {
	return len(q.seen)
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
	return strings.EqualFold(baseURL.Scheme, candidateURL.Scheme) &&
		strings.EqualFold(baseURL.Host, candidateURL.Host)
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
	return resolved.String(), true
}
