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
	"github.com/shingeki/sast-worker/internal/queue"
	"github.com/shingeki/sast-worker/internal/repository"
	"github.com/shingeki/sast-worker/internal/scanner"
)

type Pipeline struct {
	cloner            *repository.Cloner
	scanner           *scanner.SemgrepScanner
	publisher         *queue.Publisher
	logger            *slog.Logger
	labRepositoryPath string
}

func NewPipeline(
	cfg config.Config,
	publisher *queue.Publisher,
	logger *slog.Logger,
) *Pipeline {
	if logger == nil {
		logger = slog.Default()
	}
	return &Pipeline{
		cloner:            repository.NewCloner(cfg.Scanner.CloneTimeout, cfg.Scanner.GitHubToken),
		scanner:           scanner.NewSemgrepScanner(cfg.Scanner),
		publisher:         publisher,
		logger:            logger,
		labRepositoryPath: cfg.Scanner.LabRepositoryPath,
	}
}

func (p *Pipeline) Run(ctx context.Context, batch contracts.DispatchBatch) error {
	start := time.Now()

	p.logger.Info("starting sast pipeline",
		"system_id", batch.SystemID,
		"repository_url", batch.RepositoryURL,
		"lab_repository_path", p.labRepositoryPath,
	)

	repoDir, cleanup, err := p.resolveRepository(ctx, batch.RepositoryURL)
	if err != nil {
		return fmt.Errorf("clone repository: %w", err)
	}
	defer cleanup()

	findings, err := p.scanner.Scan(ctx, repoDir)
	if err != nil {
		return fmt.Errorf("semgrep scan: %w", err)
	}

	p.logger.Info("semgrep scan finished", "findings", len(findings))

	published := 0
	for _, finding := range findings {
		result := mapper.ToResultMessage(batch, finding, repoDir)
		if err := p.publisher.PublishResult(ctx, result); err != nil {
			return fmt.Errorf("publish result: %w", err)
		}
		published++
	}

	completion := contracts.DispatchCompletionMessage{
		Event:         contracts.EventDispatchCompleted,
		DispatchID:    batch.DispatchID,
		SystemID:      batch.SystemID,
		DurationMs:    time.Since(start).Milliseconds(),
		FindingsCount: published,
	}

	if err := p.publisher.PublishCompletion(ctx, completion); err != nil {
		return fmt.Errorf("publish dispatch completion: %w", err)
	}

	p.logger.Info("sast pipeline finished",
		"system_id", batch.SystemID,
		"findings", published,
		"duration_ms", time.Since(start).Milliseconds(),
	)

	return nil
}

func (p *Pipeline) resolveRepository(ctx context.Context, repositoryURL string) (string, func(), error) {
	if strings.TrimSpace(repositoryURL) != "" {
		p.logger.Info("cloning system repository", "url", repositoryURL)

		return p.cloner.Clone(ctx, repositoryURL)
	}

	if p.labRepositoryPath != "" {
		p.logger.Warn("repository_url empty; using lab repository mount", "path", p.labRepositoryPath)

		return p.labRepositoryPath, func() {}, nil
	}

	return "", nil, fmt.Errorf("repository_url is required")
}
