package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	RabbitMQ RabbitMQConfig
	Worker   WorkerConfig
	Scanner  ScannerConfig
}

type RabbitMQConfig struct {
	Host          string
	Port          int
	User          string
	Password      string
	VHost         string
	DispatchQueue string
	ResultsQueue  string
	PrefetchCount int
}

type WorkerConfig struct {
	JobTimeout time.Duration
}

type ScannerConfig struct {
	SemgrepBinary     string
	CloneTimeout      time.Duration
	ScanTimeout       time.Duration
	Languages         []string
	GitHubToken       string
	LabRepositoryPath string
}

func Load() (Config, error) {
	port, err := strconv.Atoi(getEnv("RABBITMQ_PORT", "5672"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid RABBITMQ_PORT: %w", err)
	}

	prefetch, err := strconv.Atoi(getEnv("RABBITMQ_PREFETCH", "1"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid RABBITMQ_PREFETCH: %w", err)
	}

	jobTimeout, err := time.ParseDuration(getEnv("WORKER_JOB_TIMEOUT", "30m"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid WORKER_JOB_TIMEOUT: %w", err)
	}

	cloneTimeout, err := time.ParseDuration(getEnv("SAST_CLONE_TIMEOUT", "10m"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid SAST_CLONE_TIMEOUT: %w", err)
	}

	scanTimeout, err := time.ParseDuration(getEnv("SAST_SCAN_TIMEOUT", "20m"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid SAST_SCAN_TIMEOUT: %w", err)
	}

	languages := parseLanguages(getEnv("SAST_LANGUAGES", "php,typescript,javascript"))

	cfg := Config{
		RabbitMQ: RabbitMQConfig{
			Host:          getEnv("RABBITMQ_HOST", "localhost"),
			Port:          port,
			User:          getEnv("RABBITMQ_USER", "guest"),
			Password:      getEnv("RABBITMQ_PASSWORD", "guest"),
			VHost:         getEnv("RABBITMQ_VHOST", "/"),
			DispatchQueue: getEnv("RABBITMQ_ATTACKS_DISPATCH_QUEUE", "attacks.sast.dispatch"),
			ResultsQueue:  getEnv("RABBITMQ_ATTACKS_RESULTS_QUEUE", "attacks.results"),
			PrefetchCount: prefetch,
		},
		Worker: WorkerConfig{
			JobTimeout: jobTimeout,
		},
		Scanner: ScannerConfig{
			SemgrepBinary:     getEnv("SEMGREP_BINARY", "semgrep"),
			CloneTimeout:      cloneTimeout,
			ScanTimeout:       scanTimeout,
			Languages:         languages,
			GitHubToken:       getEnv("GITHUB_TOKEN", ""),
			LabRepositoryPath: getEnv("SAST_LAB_REPOSITORY_PATH", ""),
		},
	}

	if cfg.RabbitMQ.Host == "" {
		return Config{}, fmt.Errorf("RABBITMQ_HOST is required")
	}

	return cfg, nil
}

func (c Config) RabbitMQURL() string {
	return fmt.Sprintf("amqp://%s:%s@%s:%d%s",
		c.RabbitMQ.User,
		c.RabbitMQ.Password,
		c.RabbitMQ.Host,
		c.RabbitMQ.Port,
		c.RabbitMQ.VHost,
	)
}

func parseLanguages(raw string) []string {
	parts := strings.Split(raw, ",")
	languages := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			languages = append(languages, part)
		}
	}
	return languages
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
