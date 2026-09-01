package config

import (
	"strings"
	"testing"
)

func TestRabbitMQURLEncodesCredentialsAndVHost(t *testing.T) {
	cfg := Config{
		RabbitMQ: RabbitMQConfig{
			Host:     "rabbitmq",
			Port:     5672,
			User:     "user@name",
			Password: "p@ss:word",
			VHost:    normalizeVHost("shingeki"),
		},
	}

	got := cfg.RabbitMQURL()
	if strings.Contains(got, "p@ss:word") {
		t.Fatalf("password was not encoded: %s", got)
	}
	if !strings.Contains(got, "p%40ss%3Aword") && !strings.Contains(got, "p%40ss") {
		t.Fatalf("expected encoded password, got %s", got)
	}
	if !strings.HasSuffix(got, "/shingeki") && !strings.Contains(got, "/shingeki") {
		t.Fatalf("expected vhost path, got %s", got)
	}
}

func TestNormalizeVHost(t *testing.T) {
	if got := normalizeVHost("shingeki"); got != "/shingeki" {
		t.Fatalf("expected leading slash, got %q", got)
	}
	if got := normalizeVHost("/"); got != "/" {
		t.Fatalf("expected root vhost, got %q", got)
	}
}
