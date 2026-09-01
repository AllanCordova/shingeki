package queue

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/shingeki/sast-worker/internal/config"
	"github.com/shingeki/sast-worker/internal/contracts"
	"github.com/shingeki/sast-worker/internal/repository"
)

type Handler func(ctx context.Context, batch contracts.DispatchBatch) error

type Consumer struct {
	cfg     config.RabbitMQConfig
	handler Handler
	logger  *slog.Logger
}

func NewConsumer(cfg config.RabbitMQConfig, handler Handler, logger *slog.Logger) *Consumer {
	if logger == nil {
		logger = slog.Default()
	}
	return &Consumer{cfg: cfg, handler: handler, logger: logger}
}

func (c *Consumer) Run(ctx context.Context, url string) error {
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		err := c.consumeOnce(ctx, url)
		if err == nil || errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return err
		}
		c.logger.Error("consumer connection lost, reconnecting", "error", err)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
}

func (c *Consumer) consumeOnce(ctx context.Context, url string) error {
	conn, err := dialRabbitMQ(ctx, url)
	if err != nil {
		return err
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return fmt.Errorf("open channel: %w", err)
	}
	defer ch.Close()

	if err := DeclareAttackQueues(ch, c.cfg.DispatchQueue, c.cfg.ResultsQueue); err != nil {
		return err
	}

	if err := ch.Qos(c.cfg.PrefetchCount, 0, false); err != nil {
		return fmt.Errorf("set qos: %w", err)
	}

	deliveries, err := ch.Consume(
		c.cfg.DispatchQueue,
		"sast-worker",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("consume %q: %w", c.cfg.DispatchQueue, err)
	}

	c.logger.Info("consuming dispatch queue", "queue", c.cfg.DispatchQueue)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case delivery, ok := <-deliveries:
			if !ok {
				return fmt.Errorf("delivery channel closed")
			}
			c.handleDelivery(ctx, delivery)
		}
	}
}

func (c *Consumer) handleDelivery(ctx context.Context, delivery amqp.Delivery) {
	batch, err := contracts.ParseDispatchBatch(delivery.Body)
	if err != nil {
		c.logger.Error("invalid dispatch message", "error", err)
		_ = delivery.Nack(false, false)
		return
	}

	c.logger.Info("processing dispatch batch",
		"system_id", batch.SystemID,
		"repository_url", repository.RedactedURL(batch.RepositoryURL),
		"attacks", len(batch.Attacks),
	)

	if err := c.handler(ctx, batch); err != nil {
		c.logger.Error("pipeline failed",
			"system_id", batch.SystemID,
			"error", err,
		)
		_ = delivery.Nack(false, false)
		return
	}

	if err := delivery.Ack(false); err != nil {
		c.logger.Error("ack failed", "error", err)
	}
}
