package goldset

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"time"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

type Options struct {
	Rod      bool
	Auth     bool
	Coverage bool
	Email    string
	Password string
	Timeout  time.Duration
	Logger   *slog.Logger
}

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

func Evaluate(ctx context.Context, targetURL string, opts Options) (Report, error) {
	if err := targeturl.AssertHTTP(targetURL); err != nil {
		return Report{}, fmt.Errorf("target url: %w", err)
	}
	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = 45 * time.Second
	}
	logger := opts.Logger
	if logger == nil {
		logger = slog.New(slog.NewTextHandler(io.Discard, nil))
	}

	runCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	cfg := config.Config{
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
		Discovery: config.DiscoveryConfig{
			RodEnabled:           opts.Rod,
			RodHeadless:          true,
			RodNoSandbox:         true,
			BrowserLaunchTimeout: 20 * time.Second,
			PageTimeout:          8 * time.Second,
			ChromePath:           os.Getenv("CHROME_PATH"),
		},
	}

	engine := attack.NewRestyEngine(cfg.Attack, logger)
	validator := evidence.NewDefaultValidator(cfg, logger)
	defer func() { _ = validator.Close() }()

	vectors := Vectors(targetURL)
	catalog := Catalog()
	expected := ExpectedChallenges(opts.Rod)
	if opts.Coverage {
		session, err := Login(runCtx, targetURL, opts.Email, opts.Password)
		if err != nil {
			return Report{}, err
		}
		logger.Info("juice shop session", "email", session.Email, "bid", session.Bid, "mode", "coverage")
		vectors = CoverageVectors(targetURL, session)
		catalog = CoverageCatalog()
		expected = ExpectedCoverageChallenges()
		jobs := engine.MapVectorsToJobs(vectors, catalog)
		jobs = attack.ApplyAuth(jobs, &contracts.TargetAuth{
			Type:    "bearer",
			Headers: BearerAuth(session),
		})
		return finishReport(runCtx, engine, validator, targetURL, jobs, expected)
	}
	if opts.Auth {
		session, err := Login(runCtx, targetURL, opts.Email, opts.Password)
		if err != nil {
			return Report{}, err
		}
		logger.Info("juice shop session", "email", session.Email, "bid", session.Bid)
		vectors = AuthVectors(targetURL, session)
		catalog = AuthCatalog()
		expected = ExpectedAuthChallenges()
		jobs := engine.MapVectorsToJobs(vectors, catalog)
		jobs = attack.ApplyAuth(jobs, &contracts.TargetAuth{
			Type:    "bearer",
			Headers: BearerAuth(session),
		})
		return finishReport(runCtx, engine, validator, targetURL, jobs, expected)
	}

	jobs := engine.MapVectorsToJobs(vectors, catalog)
	return finishReport(runCtx, engine, validator, targetURL, jobs, expected)
}

func finishReport(
	ctx context.Context,
	engine attack.Engine,
	validator evidence.Validator,
	targetURL string,
	jobs []types.Job,
	expected []string,
) (Report, error) {
	start := time.Now()
	responses := engine.ExecutePool(ctx, jobs)

	report := Report{
		Target:   targetURL,
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
			Challenge: Classify(finding.VulnerableRoute, response.Job.Attack.Category),
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
