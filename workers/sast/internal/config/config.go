package config

import (
	"fmt"
	"net"
	"net/url"
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
	CloneHosts        []string
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

	jobTimeout, err := time.ParseDuration(getEnv("WORKER_JOB_TIMEOUT", "40m"))
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

	needed := cloneTimeout + scanTimeout + 5*time.Minute
	if jobTimeout < needed {
		jobTimeout = needed
	}

	cfg := Config{
		RabbitMQ: RabbitMQConfig{
			Host:          getEnv("RABBITMQ_HOST", "localhost"),
			Port:          port,
			User:          getEnv("RABBITMQ_USER", "guest"),
			Password:      getEnv("RABBITMQ_PASSWORD", "guest"),
			VHost:         normalizeVHost(getEnv("RABBITMQ_VHOST", "/")),
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
			Languages:         parseCSV(getEnv("SAST_LANGUAGES", "php,typescript,javascript")),
			CloneHosts:        parseCSV(getEnv("SAST_CLONE_HOSTS", "github.com")),
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
	u := url.URL{
		Scheme: "amqp",
		User:   url.UserPassword(c.RabbitMQ.User, c.RabbitMQ.Password),
		Host:   net.JoinHostPort(c.RabbitMQ.Host, strconv.Itoa(c.RabbitMQ.Port)),
		Path:   c.RabbitMQ.VHost,
	}
	return u.String()
}

func normalizeVHost(vhost string) string {
	vhost = strings.TrimSpace(vhost)
	if vhost == "" {
		return "/"
	}
	if !strings.HasPrefix(vhost, "/") {
		return "/" + vhost
	}
	return vhost
}

func parseCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			values = append(values, part)
		}
	}
	return values
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
