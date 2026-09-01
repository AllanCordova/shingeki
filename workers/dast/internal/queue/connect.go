package queue

import (
	"context"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const defaultDialAttempts = 15

func dialRabbitMQ(ctx context.Context, url string) (*amqp.Connection, error) {
	var lastErr error
	for attempt := 1; attempt <= defaultDialAttempts; attempt++ {
		conn, err := amqp.DialConfig(url, amqp.Config{Dial: amqp.DefaultDial(10 * time.Second)})
		if err == nil {
			return conn, nil
		}
		lastErr = err

		wait := time.Duration(attempt) * time.Second
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(wait):
		}
	}

	return nil, fmt.Errorf("connect rabbitmq after %d attempts: %w", defaultDialAttempts, lastErr)
}
