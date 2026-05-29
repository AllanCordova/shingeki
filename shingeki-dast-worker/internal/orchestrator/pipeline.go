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
	published := 0

	defer func() {
		completion := contracts.DispatchCompletionMessage{
			Event:         contracts.EventDispatchCompleted,
			DispatchID:    batch.DispatchID,
			SystemID:      batch.SystemID,
			DurationMs:    time.Since(start).Milliseconds(),
			FindingsCount: published,
		}

		if err := p.publisher.PublishCompletion(context.Background(), completion); err != nil {
			p.logger.Error("failed to publish dispatch completion", "error", err, "dispatch_id", batch.DispatchID)
		}
	}()

	p.logger.Info("starting pipeline", "system_id", batch.SystemID, "target", batch.TargetURL)

	vectors, err := p.discovery.Discover(ctx, batch.TargetURL)
	if err != nil {
		return fmt.Errorf("discovery: %w", err)
	}
	p.logger.Info("discovery finished", "vectors", len(vectors))

	jobs := p.attack.MapVectorsToJobs(vectors, batch.Attacks)
	p.logger.Info("mapped attack jobs", "jobs", len(jobs))

	responses := p.attack.ExecutePool(ctx, jobs)
	for _, response := range responses {
		if response.Error != nil {
			p.logger.Warn("attack job failed",
				"attack_id", response.Job.Attack.AttackID,
				"route", response.Job.Vector.Route,
				"error", response.Error,
			)
			continue
		}

		finding := p.evidence.Analyze(ctx, response)
		if finding == nil {
			continue
		}

		result := finding.ToResultMessage(batch.DispatchID, batch.SystemID)
		if err := p.publisher.PublishResult(ctx, result); err != nil {
			return fmt.Errorf("publish result: %w", err)
		}
		published++
	}

	p.logger.Info("pipeline finished",
		"system_id", batch.SystemID,
		"findings", published,
		"duration_ms", time.Since(start).Milliseconds(),
	)

	return nil
}
