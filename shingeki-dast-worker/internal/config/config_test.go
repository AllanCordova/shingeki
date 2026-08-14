package config_test

import (
	"strings"
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

func TestLoadRejectsInvalidConcurrency(t *testing.T) {
	t.Setenv("RABBITMQ_HOST", "localhost")
	t.Setenv("WORKER_ATTACK_CONCURRENCY", "0")
	if _, err := config.Load(); err == nil {
		t.Fatal("expected invalid concurrency error")
	}
}

func TestRabbitMQURLEncodesCredentials(t *testing.T) {
	t.Setenv("RABBITMQ_HOST", "localhost")
	t.Setenv("RABBITMQ_USER", "user")
	t.Setenv("RABBITMQ_PASSWORD", "p@ss:word")
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	got := cfg.RabbitMQURL()
	if !strings.Contains(got, "p%40ss%3Aword") {
		t.Fatalf("expected encoded password in %s", got)
	}
	if strings.Contains(got, "p@ss:word") {
		t.Fatalf("raw password leaked in %s", got)
	}
}
