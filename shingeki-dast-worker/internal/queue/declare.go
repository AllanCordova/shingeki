package queue

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

func DeclareAttackQueues(ch *amqp.Channel, dispatchQueue, resultsQueue string) error {
	for _, name := range []string{dispatchQueue, resultsQueue} {
		if _, err := ch.QueueDeclare(name, true, false, false, false, nil); err != nil {
			return fmt.Errorf("declare queue %q: %w", name, err)
		}
	}
	return nil
}
