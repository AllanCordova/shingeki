package goldset

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
	"github.com/shingeki/dast-worker/internal/secrets"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func EvaluateReactLeaks(ctx context.Context, origin string) (Report, error) {
	origin = targeturl.Origin(origin)
	if origin == "" {
		return Report{}, fmt.Errorf("invalid fixture origin")
	}

	start := time.Now()
	report := Report{
		Target:   origin,
		Expected: ExpectedReactLeakChallenges(),
	}

	scanner := secrets.NewHTTPScanner()
	vectors := []contracts.AttackVector{
		contracts.NewAttackVector(origin+"/preview", http.MethodGet, "URL_PATH"),
	}
	hits, err := scanner.Scan(ctx, origin+"/", vectors, nil)
	if err != nil {
		return Report{}, err
	}
	seen := map[string]struct{}{}
	for _, hit := range hits {
		item := Finding{
			Challenge: ClassifyReactLeak(hit.Route, hit.Kind),
			Route:     hit.Route,
			Payload:   hit.Kind,
			Evidence:  secrets.Evidence(hit),
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

	xssPayload, _ := json.Marshal(map[string]any{
		"value": `<script>alert(1)</script>`,
	})
	preview := contracts.NewAttackVector(origin+"/preview?q=", http.MethodGet, "QUERY_PARAMETER")
	preview.Params["q"] = ""
	engine := attack.NewRestyEngine(config.AttackConfig{
		Concurrency:    1,
		RequestTimeout: 5 * time.Second,
		RateLimitRPS:   10,
		MaxBodyBytes:   1 << 20,
		MaxJobs:        4,
		UserAgent:      "Shingeki-DAST-Harness/1.0",
	}, nil)
	jobs := engine.MapVectorsToJobs(
		[]contracts.AttackVector{preview},
		[]contracts.AttackItem{{
			AttackID:       "gold-react-xss",
			Category:       "XSS",
			TargetLocation: "QUERY_PARAMETER",
			RiskLevel:      "MEDIUM",
			Payload:        xssPayload,
		}},
	)
	report.Jobs = len(jobs)

	validator := evidence.NewRegexValidator()
	for _, response := range engine.ExecutePool(ctx, jobs) {
		finding := validator.Analyze(ctx, response)
		if finding == nil {
			continue
		}
		item := Finding{
			Challenge: ClassifyReactLeak(finding.VulnerableRoute, response.Job.Attack.Category),
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

	report.Duration = time.Since(start)
	return report, nil
}
