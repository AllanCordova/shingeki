package orchestrator

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/shingeki/sast-worker/internal/config"
	"github.com/shingeki/sast-worker/internal/contracts"
	"github.com/shingeki/sast-worker/internal/mapper"
	"github.com/shingeki/sast-worker/internal/repository"
	"github.com/shingeki/sast-worker/internal/scanner"
)

type repositoryCloner interface {
	Clone(ctx context.Context, repositoryURL, ref string) (string, func(), error)
}

type codeScanner interface {
	Scan(ctx context.Context, repoDir string, languages []string) ([]scanner.Finding, error)
}

type resultPublisher interface {
	PublishResult(ctx context.Context, result contracts.ResultMessage) error
	PublishProbe(ctx context.Context, probe contracts.ProbeMessage) error
	PublishCompletion(ctx context.Context, completion contracts.DispatchCompletionMessage) error
}

type Pipeline struct {
	cloner            repositoryCloner
	scanner           codeScanner
	publisher         resultPublisher
	logger            *slog.Logger
	labRepositoryPath string
}

func NewPipeline(
	cfg config.Config,
	publisher resultPublisher,
	logger *slog.Logger,
) *Pipeline {
	if logger == nil {
		logger = slog.Default()
	}
	return &Pipeline{
		cloner:            repository.NewCloner(cfg.Scanner.CloneTimeout, cfg.Scanner.GitHubToken, cfg.Scanner.CloneHosts...),
		scanner:           scanner.NewSemgrepScanner(cfg.Scanner),
		publisher:         publisher,
		logger:            logger,
		labRepositoryPath: cfg.Scanner.LabRepositoryPath,
	}
}

func (p *Pipeline) Run(ctx context.Context, batch contracts.DispatchBatch) (err error) {
	start := time.Now()
	published := 0
	probes := 0

	defer func() {
		if p.publisher == nil {
			return
		}
		status := contracts.CompletionStatusCompleted
		errorMsg := ""
		if err != nil {
			status = contracts.CompletionStatusFailed
			errorMsg = err.Error()
		}
		completion := contracts.DispatchCompletionMessage{
			Event:         contracts.EventDispatchCompleted,
			DispatchID:    batch.DispatchID,
			SystemID:      batch.SystemID,
			Status:        status,
			Error:         errorMsg,
			DurationMs:    time.Since(start).Milliseconds(),
			FindingsCount: published,
			ProbesCount:   probes,
			JobsPlanned:   len(batch.Attacks),
		}
		completeCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if pubErr := p.publisher.PublishCompletion(completeCtx, completion); pubErr != nil {
			p.logger.Error("failed to publish dispatch completion", "error", pubErr, "dispatch_id", batch.DispatchID)
		}
	}()

	p.logger.Info("starting sast pipeline",
		"system_id", batch.SystemID,
		"repository_url", repository.RedactedURL(batch.RepositoryURL),
		"lab_repository_path", p.labRepositoryPath,
	)

	repoDir, cleanup, err := p.resolveRepository(ctx, batch.RepositoryURL, batch.EffectiveRepositoryRef())
	if err != nil {
		return fmt.Errorf("clone repository: %w", err)
	}
	defer cleanup()

	findings, err := p.scanner.Scan(ctx, repoDir, batch.PayloadLanguages())
	if err != nil {
		return fmt.Errorf("semgrep scan: %w", err)
	}

	p.logger.Info("semgrep scan finished", "findings", len(findings))

	matched := map[string]struct{}{}
	for _, finding := range findings {
		attackID := mapper.AttackIDForFinding(batch, finding)
		if attackID == "" {
			p.logger.Info("skipped semgrep finding without catalog match", "check_id", finding.CheckID, "path", finding.Path)
			continue
		}
		result := mapper.ToResultMessage(batch, finding, repoDir)
		result.AttackID = attackID
		if err := p.publisher.PublishResult(ctx, result); err != nil {
			return fmt.Errorf("publish result: %w", err)
		}
		matched[attackID] = struct{}{}
		published++
	}

	for _, attack := range batch.Attacks {
		if _, ok := matched[attack.AttackID]; ok {
			continue
		}
		probe := cleanCatalogProbe(batch, attack)
		if err := p.publisher.PublishProbe(ctx, probe); err != nil {
			return fmt.Errorf("publish probe: %w", err)
		}
		probes++
	}

	p.logger.Info("sast pipeline finished",
		"system_id", batch.SystemID,
		"findings", published,
		"duration_ms", time.Since(start).Milliseconds(),
	)

	return nil
}

func (p *Pipeline) resolveRepository(ctx context.Context, repositoryURL, ref string) (string, func(), error) {
	if strings.TrimSpace(repositoryURL) != "" {
		p.logger.Info("cloning system repository", "url", repository.RedactedURL(repositoryURL))

		return p.cloner.Clone(ctx, repositoryURL, ref)
	}

	if p.labRepositoryPath != "" {
		p.logger.Warn("repository_url empty; using lab repository mount", "path", p.labRepositoryPath)

		return p.labRepositoryPath, func() {}, nil
	}

	return "", nil, fmt.Errorf("repository_url is required")
}

func cleanCatalogProbe(batch contracts.DispatchBatch, attack contracts.AttackItem) contracts.ProbeMessage {
	payload := strings.Join(attack.PayloadLanguages(), ",")
	if payload == "" {
		payload = attack.Category
	}
	return contracts.ProbeMessage{
		Event:       contracts.EventAttackProbe,
		DispatchID:  batch.DispatchID,
		SystemID:    batch.SystemID,
		AttackID:    attack.AttackID,
		Route:       "semgrep:" + strings.ToLower(attack.Category),
		PayloadUsed: payload,
		Outcome:     "clean",
		Evidence:    "Semgrep ran this catalog category and found no matching rule hits.",
	}
}
