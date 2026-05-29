package attack

import (
	"context"
	"log/slog"
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
	client := resty.New().
		SetTimeout(cfg.RequestTimeout).
		SetHeader("User-Agent", cfg.UserAgent)

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
	return MapVectorsToJobs(vectors, attacks)
}

func (e *RestyEngine) ExecutePool(ctx context.Context, jobs []types.Job) []types.Response {
	if len(jobs) == 0 {
		return nil
	}

	results := make([]types.Response, len(jobs))
	sem := make(chan struct{}, e.cfg.Concurrency)
	var wg sync.WaitGroup

	for i, job := range jobs {
		wg.Add(1)
		go func(idx int, j types.Job) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			results[idx] = e.executeJob(ctx, j)
		}(i, job)
	}

	wg.Wait()
	return results
}

func (e *RestyEngine) executeJob(ctx context.Context, job types.Job) types.Response {
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

	baselineStatus, baselineBody, baselineMs, err := e.send(ctx, baselineSpec)
	if err != nil {
		resp.Error = err
		return resp
	}
	resp.BaselineStatus = baselineStatus
	resp.BaselineBody = baselineBody
	resp.BaselineMs = baselineMs

	attackStatus, attackBody, attackMs, err := e.send(ctx, attackSpec)
	if err != nil {
		resp.Error = err
		return resp
	}
	resp.AttackStatus = attackStatus
	resp.AttackBody = truncate(attackBody, e.cfg.MaxBodyBytes)
	resp.AttackMs = attackMs
	resp.RawRequest = httputil.DumpRequest(attackSpec.Method, attackSpec.URL, attackSpec.Headers, attackSpec.Body)

	return resp
}

func (e *RestyEngine) send(ctx context.Context, spec injectors.RequestSpec) (int, string, int64, error) {
	if err := e.limit.Wait(ctx); err != nil {
		return 0, "", 0, err
	}

	req := e.client.R().SetContext(ctx)
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

	body := string(httpResp.Body())
	return httpResp.StatusCode(), truncate(body, e.cfg.MaxBodyBytes), elapsed, nil
}

func truncate(body string, max int) string {
	if max <= 0 || len(body) <= max {
		return body
	}
	return body[:max]
}
