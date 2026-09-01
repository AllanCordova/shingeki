package attack

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/go-resty/resty/v2"
	"golang.org/x/time/rate"

	"github.com/shingeki/dast-worker/internal/attack/injectors"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/httputil"
)

const defaultMaxBodyBytes = 1 << 20

type baselineResult struct {
	status int
	body   string
	ms     int64
	err    error
}

type RestyEngine struct {
	cfg    config.AttackConfig
	client *resty.Client
	limit  *rate.Limiter
	logger *slog.Logger
}

func NewRestyEngine(cfg config.AttackConfig, logger *slog.Logger) *RestyEngine {
	if logger == nil {
		logger = slog.Default()
	}
	if cfg.MaxBodyBytes < 1 {
		cfg.MaxBodyBytes = defaultMaxBodyBytes
	}
	client := resty.New().
		SetTimeout(cfg.RequestTimeout).
		SetHeader("User-Agent", cfg.UserAgent).
		SetDoNotParseResponse(true).
		SetRedirectPolicy(resty.RedirectPolicyFunc(httputil.CheckSameOriginRedirect))

	limit := rate.NewLimiter(rate.Limit(cfg.RateLimitRPS), int(cfg.RateLimitRPS)+1)
	if cfg.RateLimitRPS <= 0 {
		limit = rate.NewLimiter(rate.Inf, 1)
	}

	return &RestyEngine{
		cfg:    cfg,
		client: client,
		limit:  limit,
		logger: logger,
	}
}

func (e *RestyEngine) MapVectorsToJobs(vectors []contracts.AttackVector, attacks []contracts.AttackItem) []types.Job {
	jobs := MapVectorsToJobs(vectors, attacks)
	if e.cfg.MaxJobs > 0 && len(jobs) > e.cfg.MaxJobs {
		e.logger.Warn("capping attack jobs", "before", len(jobs), "max", e.cfg.MaxJobs)
		jobs = jobs[:e.cfg.MaxJobs]
	}
	return jobs
}

func (e *RestyEngine) ExecutePool(ctx context.Context, jobs []types.Job) []types.Response {
	if len(jobs) == 0 {
		return nil
	}

	concurrency := e.cfg.Concurrency
	if concurrency < 1 {
		concurrency = 1
	}

	results := make([]types.Response, len(jobs))
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	cache := &baselineCache{values: map[string]baselineResult{}}

	for i, job := range jobs {
		select {
		case <-ctx.Done():
			results[i] = types.Response{Job: job, PayloadUsed: job.Payload.Value, Error: ctx.Err()}
			continue
		case sem <- struct{}{}:
		}

		wg.Add(1)
		go func(idx int, j types.Job) {
			defer wg.Done()
			defer func() { <-sem }()
			results[idx] = e.executeJob(ctx, j, cache)
		}(i, job)
	}

	wg.Wait()
	return results
}

type baselineCache struct {
	mu     sync.Mutex
	values map[string]baselineResult
}

func (c *baselineCache) get(key string) (baselineResult, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	got, ok := c.values[key]
	return got, ok
}

func (c *baselineCache) put(key string, result baselineResult) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.values[key] = result
}

func (e *RestyEngine) executeJob(ctx context.Context, job types.Job, cache *baselineCache) types.Response {
	resp := types.Response{Job: job, PayloadUsed: job.Payload.Value}

	baselineSpec, err := injectors.BuildBaseline(job)
	if err != nil {
		resp.Error = err
		return resp
	}
	attackSpec, err := injectors.BuildAttack(job)
	if err != nil {
		resp.Error = err
		return resp
	}
	resp.RawRequest = httputil.DumpRequest(attackSpec.Method, attackSpec.URL, attackSpec.Headers, attackSpec.Body)

	key := baselineKey(baselineSpec)
	cached, ok := cache.get(key)
	if !ok {
		status, body, ms, sendErr := e.send(ctx, baselineSpec)
		cached = baselineResult{status: status, body: body, ms: ms, err: sendErr}
		if sendErr == nil {
			cache.put(key, cached)
		}
	}
	if cached.err != nil {
		resp.Error = cached.err
		resp.TimedOut = isTimeout(cached.err)
		resp.BaselineMs = cached.ms
		return resp
	}
	resp.BaselineStatus = cached.status
	resp.BaselineBody = cached.body
	resp.BaselineMs = cached.ms

	attackStatus, attackBody, attackMs, err := e.send(ctx, attackSpec)
	if err != nil {
		resp.Error = err
		resp.AttackMs = attackMs
		resp.TimedOut = isTimeout(err)
		return resp
	}
	resp.AttackStatus = attackStatus
	resp.AttackBody = attackBody
	resp.AttackMs = attackMs
	return resp
}

func (e *RestyEngine) send(ctx context.Context, spec injectors.RequestSpec) (int, string, int64, error) {
	if err := e.limit.Wait(ctx); err != nil {
		return 0, "", 0, err
	}

	req := e.client.R().SetContext(ctx).SetDoNotParseResponse(true)
	for key, value := range spec.Headers {
		req.SetHeader(key, value)
	}
	if spec.Body != "" {
		req.SetBody(spec.Body)
	}

	start := time.Now()
	httpResp, err := req.Execute(spec.Method, spec.URL)
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		return 0, "", elapsed, err
	}

	raw := httpResp.RawBody()
	if raw == nil {
		return httpResp.StatusCode(), "", elapsed, nil
	}
	defer raw.Close()

	max := e.cfg.MaxBodyBytes
	if max < 1 {
		max = defaultMaxBodyBytes
	}
	limited, err := io.ReadAll(io.LimitReader(raw, int64(max)+1))
	if err != nil {
		return httpResp.StatusCode(), "", elapsed, err
	}
	if len(limited) > max {
		e.logger.Warn("truncated oversized response body", "bytes", len(limited), "max", max, "url", spec.URL)
		limited = limited[:max]
	}
	return httpResp.StatusCode(), httputil.Truncate(string(limited), max), elapsed, nil
}

func baselineKey(spec injectors.RequestSpec) string {
	keys := make([]string, 0, len(spec.Headers))
	for key := range spec.Headers {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	var b strings.Builder
	b.WriteString(spec.Method)
	b.WriteByte('\n')
	b.WriteString(spec.URL)
	b.WriteByte('\n')
	for _, key := range keys {
		b.WriteString(key)
		b.WriteByte(':')
		b.WriteString(spec.Headers[key])
		b.WriteByte('\n')
	}
	b.WriteString(spec.Body)
	return b.String()
}

func isTimeout(err error) bool {
	return errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled)
}
