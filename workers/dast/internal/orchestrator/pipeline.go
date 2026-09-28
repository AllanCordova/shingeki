package orchestrator

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery"
	"github.com/shingeki/dast-worker/internal/evidence"
	"github.com/shingeki/dast-worker/internal/secrets"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

const publishTimeout = 10 * time.Second

type resultPublisher interface {
	PublishProbe(ctx context.Context, probe contracts.ProbeMessage) error
	PublishResult(ctx context.Context, result contracts.ResultMessage) error
	PublishCompletion(ctx context.Context, completion contracts.DispatchCompletionMessage) error
}

type Pipeline struct {
	discovery discovery.Engine
	attack    attack.Engine
	evidence  evidence.Validator
	secrets   secrets.Scanner
	publisher resultPublisher
	logger    *slog.Logger
}

func NewPipeline(
	discoveryEngine discovery.Engine,
	attackEngine attack.Engine,
	evidenceEngine evidence.Validator,
	publisher resultPublisher,
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

func (p *Pipeline) Run(ctx context.Context, batch contracts.DispatchBatch) (err error) {
	if closer, ok := p.evidence.(io.Closer); ok {
		defer func() { _ = closer.Close() }()
	}

	start := time.Now()
	findingsPublished := 0
	probesPublished := 0
	vectorsDiscovered := 0
	jobsPlanned := 0

	defer func() {
		status := contracts.CompletionStatusCompleted
		errText := ""
		if err != nil {
			status = contracts.CompletionStatusFailed
			errText = err.Error()
		}
		completion := contracts.DispatchCompletionMessage{
			Event:             contracts.EventDispatchCompleted,
			DispatchID:        batch.DispatchID,
			SystemID:          batch.SystemID,
			Status:            status,
			Error:             errText,
			DurationMs:        time.Since(start).Milliseconds(),
			FindingsCount:     findingsPublished,
			ProbesCount:       probesPublished,
			VectorsDiscovered: vectorsDiscovered,
			JobsPlanned:       jobsPlanned,
		}

		completeCtx, cancel := context.WithTimeout(context.Background(), publishTimeout)
		defer cancel()
		if pubErr := p.publisher.PublishCompletion(completeCtx, completion); pubErr != nil {
			p.logger.Error("failed to publish dispatch completion", "error", pubErr, "dispatch_id", batch.DispatchID)
		}
	}()

	p.logger.Info("starting pipeline",
		"system_id", batch.SystemID,
		"target", batch.TargetURL,
		"depth", batch.EffectiveDepth(),
		"start_path", batch.EffectiveStartPath(),
		"max_routes", batch.EffectiveMaxRoutes(),
	)

	targetURL := targeturl.Normalize(batch.TargetURL)
	if err = targeturl.AssertHTTP(targetURL); err != nil {
		return fmt.Errorf("target url: %w", err)
	}
	if targetURL != batch.TargetURL {
		p.logger.Info("normalized target url for worker reachability", "from", batch.TargetURL, "to", targetURL)
	}

	var vectors []contracts.AttackVector
	vectors, err = p.discovery.Discover(ctx, targetURL, batch.Auth, discovery.OptionsFromBatch(batch))
	if err != nil {
		return fmt.Errorf("discovery: %w", err)
	}
	vectorsDiscovered = len(vectors)
	p.logger.Info("discovery finished", "vectors", vectorsDiscovered)

	secretFindings, secretProbes, err := p.publishSecretLeaks(ctx, batch, targetURL, vectors)
	if err != nil {
		return err
	}
	findingsPublished += secretFindings
	probesPublished += secretProbes

	jobs := p.attack.MapVectorsToJobs(vectors, batch.Attacks)
	jobs = attack.ApplyAuth(jobs, batch.Auth)
	jobsPlanned = len(jobs)
	p.logger.Info("mapped attack jobs", "jobs", jobsPlanned)

	responses := p.attack.ExecutePool(ctx, jobs)
	for _, response := range responses {
		if response.Error != nil && !response.TimedOut {
			p.logger.Warn("attack job failed",
				"attack_id", response.Job.Attack.AttackID,
				"route", response.Job.Vector.Route,
				"error", response.Error,
			)
			if err = p.publishProbe(errorProbe(batch, response)); err != nil {
				return err
			}
			probesPublished++
			continue
		}

		finding := p.evidence.Analyze(ctx, response)
		if response.Error != nil && finding == nil {
			if err = p.publishProbe(errorProbe(batch, response)); err != nil {
				return err
			}
			probesPublished++
			continue
		}

		outcome := "clean"
		evidenceText := fmt.Sprintf("HTTP %d · nenhum indicador detectado", response.AttackStatus)

		if finding != nil {
			outcome = "vulnerable"
			evidenceText = finding.Evidence

			result := finding.ToResultMessage(batch.DispatchID, batch.SystemID)
			if err = p.publishResult(result); err != nil {
				return err
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
		if err = p.publishProbe(probe); err != nil {
			return err
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

func (p *Pipeline) publishProbe(probe contracts.ProbeMessage) error {
	ctx, cancel := context.WithTimeout(context.Background(), publishTimeout)
	defer cancel()
	if err := p.publisher.PublishProbe(ctx, probe); err != nil {
		return fmt.Errorf("publish probe: %w", err)
	}
	return nil
}

func (p *Pipeline) publishResult(result contracts.ResultMessage) error {
	ctx, cancel := context.WithTimeout(context.Background(), publishTimeout)
	defer cancel()
	if err := p.publisher.PublishResult(ctx, result); err != nil {
		return fmt.Errorf("publish result: %w", err)
	}
	return nil
}

func (p *Pipeline) publishSecretLeaks(
	ctx context.Context,
	batch contracts.DispatchBatch,
	targetURL string,
	vectors []contracts.AttackVector,
) (int, int, error) {
	attackID := secretLeakAttackID(batch.Attacks)
	if attackID == "" {
		return 0, 0, nil
	}

	scanner := p.secrets
	if scanner == nil {
		scanner = secrets.NewHTTPScanner()
	}
	hits, err := scanner.Scan(ctx, targetURL, vectors, batch.Auth)
	if err != nil {
		p.logger.Warn("secret leak scan failed", "error", err)
		return 0, 0, nil
	}

	findings := 0
	for _, hit := range hits {
		result := contracts.ResultMessage{
			DispatchID:      batch.DispatchID,
			AttackID:        attackID,
			SystemID:        batch.SystemID,
			VulnerableRoute: hit.Route,
			PayloadUsed:     hit.Kind,
			Evidence:        secrets.Evidence(hit),
			HTTPRequest:     hit.Request,
		}
		if pubErr := p.publishResult(result); pubErr != nil {
			return findings, 0, pubErr
		}
		findings++
	}

	outcome := "clean"
	evidenceText := "Nenhum token comum vazado nas respostas same-origin."
	if findings > 0 {
		outcome = "vulnerable"
		evidenceText = fmt.Sprintf("%d token(s) leaked in browser-reachable responses", findings)
	}
	probe := contracts.ProbeMessage{
		Event:       contracts.EventAttackProbe,
		DispatchID:  batch.DispatchID,
		SystemID:    batch.SystemID,
		AttackID:    attackID,
		Route:       strings.TrimRight(targetURL, "/") + "/api/config",
		PayloadUsed: "passive",
		HTTPRequest: "GET " + targetURL,
		Outcome:     outcome,
		Evidence:    evidenceText,
	}
	if pubErr := p.publishProbe(probe); pubErr != nil {
		return findings, 0, pubErr
	}
	return findings, 1, nil
}

func secretLeakAttackID(attacks []contracts.AttackItem) string {
	for _, attackItem := range attacks {
		if strings.EqualFold(strings.TrimSpace(attackItem.Category), "SECRET_LEAK") {
			return attackItem.AttackID
		}
	}
	return ""
}

func errorProbe(batch contracts.DispatchBatch, response types.Response) contracts.ProbeMessage {
	errText := ""
	if response.Error != nil {
		errText = response.Error.Error()
	}
	return contracts.ProbeMessage{
		Event:        contracts.EventAttackProbe,
		DispatchID:   batch.DispatchID,
		SystemID:     batch.SystemID,
		AttackID:     response.Job.Attack.AttackID,
		Route:        response.Job.Vector.Route,
		PayloadUsed:  response.PayloadUsed,
		HTTPRequest:  response.RawRequest,
		Outcome:      "error",
		Evidence:     "Falha ao executar teste",
		ErrorMessage: errText,
	}
}
