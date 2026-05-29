package config_test

import (
	"testing"

	"github.com/shingeki/dast-worker/internal/config"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("RABBITMQ_HOST", "localhost")
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.RabbitMQ.DispatchQueue != "attacks.dispatch" {
		t.Fatalf("unexpected dispatch queue: %s", cfg.RabbitMQ.DispatchQueue)
	}
	if cfg.Attack.Concurrency != 5 {
		t.Fatalf("unexpected concurrency: %d", cfg.Attack.Concurrency)
	}
}
