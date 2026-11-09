package queue

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/shingeki/sast-worker/internal/contracts"
)

const cancelEvent = "attack.dispatch.cancel"

type CancelRegistry struct {
	mu     sync.Mutex
	active map[string]context.CancelCauseFunc
	early  map[string]time.Time
}

func NewCancelRegistry() *CancelRegistry {
	return &CancelRegistry{
		active: map[string]context.CancelCauseFunc{},
		early:  map[string]time.Time{},
	}
}

func (r *CancelRegistry) Cancel(dispatchID string) {
	if r == nil || dispatchID == "" {
		return
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	r.pruneLocked(time.Now())

	if cancel, ok := r.active[dispatchID]; ok {
		cancel(contracts.ErrDispatchCancelled)
		return
	}

	r.early[dispatchID] = time.Now()
}

func (r *CancelRegistry) Begin(parent context.Context, dispatchID string) (context.Context, func()) {
	if r == nil {
		return parent, func() {}
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	r.pruneLocked(time.Now())

	ctx, cancel := context.WithCancelCause(parent)
	if _, ok := r.early[dispatchID]; ok {
		delete(r.early, dispatchID)
		cancel(contracts.ErrDispatchCancelled)
		return ctx, func() {}
	}

	r.active[dispatchID] = cancel
	return ctx, func() {
		r.mu.Lock()
		delete(r.active, dispatchID)
		r.mu.Unlock()
		cancel(nil)
	}
}

func (r *CancelRegistry) pruneLocked(now time.Time) {
	for id, at := range r.early {
		if now.Sub(at) > 6*time.Hour {
			delete(r.early, id)
		}
	}
}

func RunCancelConsumer(ctx context.Context, url, queueName string, registry *CancelRegistry, logger *slog.Logger) error {
	if registry == nil {
		return fmt.Errorf("cancel registry is required")
	}
	if logger == nil {
		logger = slog.Default()
	}

	for {
		if err := ctx.Err(); err != nil {
			return err
		}

		err := consumeCancelsOnce(ctx, url, queueName, registry, logger)
		if err == nil || errors.Is(err, context.Canceled) {
			return err
		}

		logger.Error("cancel consumer connection lost, reconnecting", "error", err, "queue", queueName)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
}

func consumeCancelsOnce(ctx context.Context, url, exchangeName string, registry *CancelRegistry, logger *slog.Logger) error {
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

	queueName, err := declareCancelFanout(ch, exchangeName)
	if err != nil {
		return err
	}

	deliveries, err := ch.Consume(queueName, "", false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("consume %q: %w", queueName, err)
	}

	logger.Info("consuming cancel queue", "exchange", exchangeName, "queue", queueName)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case delivery, ok := <-deliveries:
			if !ok {
				return fmt.Errorf("cancel delivery channel closed")
			}
			handleCancelDelivery(registry, logger, delivery)
		}
	}
}

func declareCancelFanout(ch *amqp.Channel, exchangeName string) (string, error) {
	if err := ch.ExchangeDeclare(exchangeName, "fanout", true, false, false, false, nil); err != nil {
		return "", fmt.Errorf("declare cancel exchange %q: %w", exchangeName, err)
	}

	queueName := cancelQueueName(exchangeName, newCancelInstanceID())
	// Exclusive and auto-delete: each process gets its own copy of the fanout.
	// A shared durable queue on the same host delivers the cancel to only one worker.
	if _, err := ch.QueueDeclare(queueName, false, true, true, false, nil); err != nil {
		return "", fmt.Errorf("declare cancel queue %q: %w", queueName, err)
	}
	if err := ch.QueueBind(queueName, "", exchangeName, false, nil); err != nil {
		return "", fmt.Errorf("bind cancel queue %q: %w", queueName, err)
	}

	return queueName, nil
}

func cancelQueueName(exchangeName, instanceID string) string {
	instanceID = strings.TrimSpace(instanceID)
	if instanceID == "" {
		instanceID = "worker"
	}
	return exchangeName + "." + instanceID
}

func newCancelInstanceID() string {
	buf := make([]byte, 4)
	if _, err := rand.Read(buf); err != nil {
		return strings.ReplaceAll(time.Now().UTC().Format("150405.000000"), ".", "")
	}
	return hex.EncodeToString(buf)
}

func handleCancelDelivery(registry *CancelRegistry, logger *slog.Logger, delivery amqp.Delivery) {
	var message struct {
		Event      string `json:"event"`
		DispatchID string `json:"dispatch_id"`
	}
	if err := json.Unmarshal(delivery.Body, &message); err != nil || message.Event != cancelEvent || message.DispatchID == "" {
		logger.Error("invalid cancel message", "error", err)
		_ = delivery.Nack(false, false)
		return
	}

	logger.Info("cancelling dispatch", "dispatch_id", message.DispatchID)
	registry.Cancel(message.DispatchID)

	if err := delivery.Ack(false); err != nil {
		logger.Error("cancel ack failed", "error", err)
	}
}
