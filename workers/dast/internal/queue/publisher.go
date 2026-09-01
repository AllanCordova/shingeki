package queue

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
)

type Publisher struct {
	cfg    config.RabbitMQConfig
	logger *slog.Logger

	mu   sync.Mutex
	url  string
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
	p.url = url
	return p.connectLocked()
}

func (p *Publisher) connectLocked() error {
	if p.conn != nil && !p.conn.IsClosed() && p.ch != nil {
		return nil
	}
	p.closeLocked()

	conn, err := amqp.DialConfig(p.url, amqp.Config{Dial: amqp.DefaultDial(10 * time.Second)})
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
	return p.closeLocked()
}

func (p *Publisher) closeLocked() error {
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

func (p *Publisher) PublishProbe(ctx context.Context, probe contracts.ProbeMessage) error {
	return p.publishJSON(ctx, probe.MarshalJSONBytes, "published probe",
		"attack_id", probe.AttackID,
		"system_id", probe.SystemID,
		"route", probe.Route,
		"outcome", probe.Outcome,
	)
}

func (p *Publisher) PublishResult(ctx context.Context, result contracts.ResultMessage) error {
	return p.publishJSON(ctx, result.MarshalJSONBytes, "published result",
		"attack_id", result.AttackID,
		"system_id", result.SystemID,
		"route", result.VulnerableRoute,
	)
}

func (p *Publisher) PublishCompletion(ctx context.Context, completion contracts.DispatchCompletionMessage) error {
	return p.publishJSON(ctx, completion.MarshalJSONBytes, "published dispatch completion",
		"dispatch_id", completion.DispatchID,
		"system_id", completion.SystemID,
		"status", completion.Status,
		"findings_count", completion.FindingsCount,
	)
}

func (p *Publisher) publishJSON(
	ctx context.Context,
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

	if ctx == nil {
		ctx = context.Background()
	}

	if err := p.ensureChannelLocked(); err != nil {
		return err
	}

	err = p.ch.PublishWithContext(
		ctx,
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
		if recErr := p.connectLocked(); recErr != nil {
			return fmt.Errorf("publish message: %w", err)
		}
		err = p.ch.PublishWithContext(
			ctx,
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
	}

	if len(logArgs) > 0 {
		p.logger.Info(logMessage, logArgs...)
	}

	return nil
}

func (p *Publisher) ensureChannelLocked() error {
	if p.ch != nil && p.conn != nil && !p.conn.IsClosed() {
		return nil
	}
	if p.url == "" {
		return fmt.Errorf("publisher not connected")
	}
	return p.connectLocked()
}
