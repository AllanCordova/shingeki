package queue

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
)

type Publisher struct {
	cfg    config.RabbitMQConfig
	logger *slog.Logger

	mu   sync.Mutex
	conn *amqp.Connection
	ch   *amqp.Channel
}

func NewPublisher(cfg config.RabbitMQConfig, logger *slog.Logger) *Publisher {
	if logger == nil {
		logger = slog.Default()
	}
	return &Publisher{cfg: cfg, logger: logger}
}

func (p *Publisher) Connect(url string) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.conn != nil && !p.conn.IsClosed() {
		return nil
	}

	conn, err := amqp.Dial(url)
	if err != nil {
		return fmt.Errorf("connect rabbitmq: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("open channel: %w", err)
	}

	if err := DeclareAttackQueues(ch, p.cfg.DispatchQueue, p.cfg.ResultsQueue); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return err
	}

	p.conn = conn
	p.ch = ch
	return nil
}

func (p *Publisher) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	var err error
	if p.ch != nil {
		err = p.ch.Close()
		p.ch = nil
	}
	if p.conn != nil {
		if closeErr := p.conn.Close(); closeErr != nil && err == nil {
			err = closeErr
		}
		p.conn = nil
	}
	return err
}

func (p *Publisher) PublishResult(_ context.Context, result contracts.ResultMessage) error {
	return p.publishJSON(result.MarshalJSONBytes, "published result",
		"attack_id", result.AttackID,
		"system_id", result.SystemID,
		"route", result.VulnerableRoute,
	)
}

func (p *Publisher) PublishCompletion(_ context.Context, completion contracts.DispatchCompletionMessage) error {
	return p.publishJSON(completion.MarshalJSONBytes, "published dispatch completion",
		"dispatch_id", completion.DispatchID,
		"system_id", completion.SystemID,
		"findings_count", completion.FindingsCount,
	)
}

func (p *Publisher) publishJSON(
	marshal func() ([]byte, error),
	logMessage string,
	logArgs ...any,
) error {
	data, err := marshal()
	if err != nil {
		return err
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	if p.ch == nil || p.conn == nil || p.conn.IsClosed() {
		return fmt.Errorf("publisher not connected")
	}

	err = p.ch.PublishWithContext(
		context.Background(),
		"",
		p.cfg.ResultsQueue,
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Body:         data,
		},
	)
	if err != nil {
		return fmt.Errorf("publish message: %w", err)
	}

	if len(logArgs) > 0 {
		p.logger.Info(logMessage, logArgs...)
	}

	return nil
}
