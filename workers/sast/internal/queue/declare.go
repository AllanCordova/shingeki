package queue

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

func DeclareAttackQueues(ch *amqp.Channel, names ...string) error {
	for _, name := range names {
		if name == "" {
			continue
		}
		if _, err := ch.QueueDeclare(name, true, false, false, false, nil); err != nil {
			return fmt.Errorf("declare queue %q: %w", name, err)
		}
	}
	return nil
}
