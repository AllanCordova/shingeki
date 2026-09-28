package goldset

import (
	"context"
	"io"
	"log/slog"
	"time"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
)

type Finding struct {
	Challenge string
	Route     string
	Payload   string
	Evidence  string
}

type Report struct {
	Target     string
	Duration   time.Duration
	Jobs       int
	Expected   []string
	Hits       []Finding
	Unexpected []Finding
}

type jobPair struct {
	vectors []contracts.AttackVector
	catalog []contracts.AttackItem
}

func (r Report) Missing() []string {
	found := map[string]struct{}{}
	for _, hit := range r.Hits {
		found[hit.Challenge] = struct{}{}
	}
	var missing []string
	for _, name := range r.Expected {
		if _, ok := found[name]; !ok {
			missing = append(missing, name)
		}
	}
	return missing
}

func harnessConfig() config.Config {
	return config.Config{
		Attack: config.AttackConfig{
			Concurrency:    4,
			RequestTimeout: 8 * time.Second,
			RateLimitRPS:   20,
			MaxBodyBytes:   1 << 20,
			MaxJobs:        200,
			UserAgent:      "Shingeki-DAST-Harness/1.0",
		},
		Evidence: config.EvidenceConfig{
			BodyDiffThreshold: 100,
			TimingTolerance:   2 * time.Second,
		},
	}
}

func newHarnessEngine() attack.Engine {
	cfg := harnessConfig()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return attack.NewRestyEngine(cfg.Attack, logger)
}

func mapPairs(engine attack.Engine, pairs []jobPair) []types.Job {
	var jobs []types.Job
	for _, pair := range pairs {
		jobs = append(jobs, engine.MapVectorsToJobs(pair.vectors, pair.catalog)...)
	}
	return jobs
}

func executeJobs(
	ctx context.Context,
	origin string,
	jobs []types.Job,
	expected []string,
	classify func(route, category string) string,
) (Report, error) {
	cfg := harnessConfig()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	engine := attack.NewRestyEngine(cfg.Attack, logger)
	validator := evidence.NewDefaultValidator(cfg, logger)
	defer func() { _ = validator.Close() }()

	start := time.Now()
	responses := engine.ExecutePool(ctx, jobs)

	report := Report{
		Target:   origin,
		Duration: time.Since(start),
		Jobs:     len(jobs),
		Expected: expected,
	}

	seen := map[string]struct{}{}
	for _, response := range responses {
		finding := validator.Analyze(ctx, response)
		if finding == nil {
			continue
		}
		item := Finding{
			Challenge: classify(finding.VulnerableRoute, response.Job.Attack.Category),
			Route:     finding.VulnerableRoute,
			Payload:   finding.PayloadUsed,
			Evidence:  finding.Evidence,
		}
		if item.Challenge == "" {
			report.Unexpected = append(report.Unexpected, item)
			continue
		}
		if _, ok := seen[item.Challenge]; ok {
			continue
		}
		seen[item.Challenge] = struct{}{}
		report.Hits = append(report.Hits, item)
	}

	return report, nil
}
