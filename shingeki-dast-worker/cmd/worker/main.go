package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery"
	"github.com/shingeki/dast-worker/internal/evidence"
	"github.com/shingeki/dast-worker/internal/orchestrator"
	"github.com/shingeki/dast-worker/internal/queue"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}

	publisher := queue.NewPublisher(cfg.RabbitMQ, logger)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := connectPublisherWithRetry(ctx, publisher, cfg.RabbitMQURL(), logger); err != nil {
		logger.Error("connect publisher", "error", err)
		os.Exit(1)
	}
	defer publisher.Close()

	discoveryEngine := discovery.NewCompositeEngine(cfg, logger)
	attackEngine := attack.NewRestyEngine(cfg.Attack, logger)
	evidenceEngine := evidence.NewCompositeValidator(
		evidence.NewRegexValidator(),
		evidence.NewDiffValidator(cfg.Evidence),
		evidence.NewTimingValidator(cfg.Evidence),
	)

	pipeline := orchestrator.NewPipeline(discoveryEngine, attackEngine, evidenceEngine, publisher, logger)

	consumer := queue.NewConsumer(cfg.RabbitMQ, func(jobCtx context.Context, batch contracts.DispatchBatch) error {
		runCtx, cancel := context.WithTimeout(jobCtx, cfg.Worker.JobTimeout)
		defer cancel()
		return pipeline.Run(runCtx, batch)
	}, logger)

	logger.Info("dast worker started")
	if err := consumer.Run(ctx, cfg.RabbitMQURL()); err != nil && err != context.Canceled {
		logger.Error("consumer stopped", "error", err)
		os.Exit(1)
	}
}

func connectPublisherWithRetry(
	ctx context.Context,
	publisher *queue.Publisher,
	url string,
	logger *slog.Logger,
) error {
	const maxAttempts = 15
	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		if err := publisher.Connect(url); err == nil {
			return nil
		} else {
			lastErr = err
		}
		logger.Warn("rabbitmq not ready, retrying publisher connect",
			"attempt", attempt,
			"max_attempts", maxAttempts,
			"error", lastErr,
		)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(time.Duration(attempt) * time.Second):
		}
	}
	return lastErr
}
