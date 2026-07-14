package orchestrator

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery"
	"github.com/shingeki/dast-worker/internal/evidence"
	"github.com/shingeki/dast-worker/internal/queue"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

type Pipeline struct {
	discovery discovery.Engine
	attack    attack.Engine
	evidence  evidence.Validator
	publisher *queue.Publisher
	logger    *slog.Logger
}

func NewPipeline(
	discoveryEngine discovery.Engine,
	attackEngine attack.Engine,
	evidenceEngine evidence.Validator,
	publisher *queue.Publisher,
	logger *slog.Logger,
) *Pipeline {
	if logger == nil {
		logger = slog.Default()
	}
	return &Pipeline{
		discovery: discoveryEngine,
		attack:    attackEngine,
		evidence:  evidenceEngine,
		publisher: publisher,
		logger:    logger,
	}
}

func (p *Pipeline) Run(ctx context.Context, batch contracts.DispatchBatch) error {
	start := time.Now()
	findingsPublished := 0
	probesPublished := 0
	vectorsDiscovered := 0
	jobsPlanned := 0

	defer func() {
		completion := contracts.DispatchCompletionMessage{
			Event:             contracts.EventDispatchCompleted,
			DispatchID:        batch.DispatchID,
			SystemID:          batch.SystemID,
			DurationMs:        time.Since(start).Milliseconds(),
			FindingsCount:     findingsPublished,
			ProbesCount:       probesPublished,
			VectorsDiscovered: vectorsDiscovered,
			JobsPlanned:       jobsPlanned,
		}

		if err := p.publisher.PublishCompletion(context.Background(), completion); err != nil {
			p.logger.Error("failed to publish dispatch completion", "error", err, "dispatch_id", batch.DispatchID)
		}
	}()

	p.logger.Info("starting pipeline",
		"system_id", batch.SystemID,
		"target", batch.TargetURL,
		"depth", batch.EffectiveDepth(),
	)

	targetURL := targeturl.Normalize(batch.TargetURL)
	if targetURL != batch.TargetURL {
		p.logger.Info("normalized target url for worker reachability", "from", batch.TargetURL, "to", targetURL)
	}

	authHeaders := batch.AuthHeaders()
	vectors, err := p.discovery.Discover(ctx, targetURL, authHeaders, batch.EffectiveDepth())
	if err != nil {
		return fmt.Errorf("discovery: %w", err)
	}
	vectorsDiscovered = len(vectors)
	p.logger.Info("discovery finished", "vectors", vectorsDiscovered)

	jobs := p.attack.MapVectorsToJobs(vectors, batch.Attacks)
	jobs = attack.ApplyGlobalHeaders(jobs, authHeaders)
	jobsPlanned = len(jobs)
	p.logger.Info("mapped attack jobs", "jobs", jobsPlanned)

	responses := p.attack.ExecutePool(ctx, jobs)
	for _, response := range responses {
		if response.Error != nil {
			p.logger.Warn("attack job failed",
				"attack_id", response.Job.Attack.AttackID,
				"route", response.Job.Vector.Route,
				"error", response.Error,
			)

			probe := contracts.ProbeMessage{
				Event:        contracts.EventAttackProbe,
				DispatchID:   batch.DispatchID,
				SystemID:     batch.SystemID,
				AttackID:     response.Job.Attack.AttackID,
				Route:        response.Job.Vector.Route,
				PayloadUsed:  response.PayloadUsed,
				HTTPRequest:  response.RawRequest,
				Outcome:      "error",
				Evidence:     "Falha ao executar teste",
				ErrorMessage: response.Error.Error(),
			}
			if err := p.publisher.PublishProbe(ctx, probe); err != nil {
				return fmt.Errorf("publish probe: %w", err)
			}
			probesPublished++
			continue
		}

		finding := p.evidence.Analyze(ctx, response)
		outcome := "clean"
		evidenceText := fmt.Sprintf("HTTP %d · nenhum indicador detectado", response.AttackStatus)

		if finding != nil {
			outcome = "vulnerable"
			evidenceText = finding.Evidence

			result := finding.ToResultMessage(batch.DispatchID, batch.SystemID)
			if err := p.publisher.PublishResult(ctx, result); err != nil {
				return fmt.Errorf("publish result: %w", err)
			}
			findingsPublished++
		}

		probe := contracts.ProbeMessage{
			Event:       contracts.EventAttackProbe,
			DispatchID:  batch.DispatchID,
			SystemID:    batch.SystemID,
			AttackID:    response.Job.Attack.AttackID,
			Route:       response.Job.Vector.Route,
			PayloadUsed: response.PayloadUsed,
			HTTPRequest: response.RawRequest,
			Outcome:     outcome,
			Evidence:    evidenceText,
		}
		if err := p.publisher.PublishProbe(ctx, probe); err != nil {
			return fmt.Errorf("publish probe: %w", err)
		}
		probesPublished++
	}

	p.logger.Info("pipeline finished",
		"system_id", batch.SystemID,
		"findings", findingsPublished,
		"probes", probesPublished,
		"duration_ms", time.Since(start).Milliseconds(),
	)

	return nil
}
