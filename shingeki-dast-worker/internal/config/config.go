package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	RabbitMQ RabbitMQConfig
	Worker   WorkerConfig
	Discovery DiscoveryConfig
	Attack   AttackConfig
	Evidence EvidenceConfig
}

type RabbitMQConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	VHost           string
	DispatchQueue   string
	ResultsQueue    string
	PrefetchCount   int
}

type WorkerConfig struct {
	JobTimeout time.Duration
}

type DiscoveryConfig struct {
	MaxDepth              int
	MaxPages              int
	PageTimeout           time.Duration
	BrowserLaunchTimeout  time.Duration
	RodEnabled            bool
	RodHeadless           bool
	RodNoSandbox          bool
	ChromePath            string
	MinVectorsForRod      int
}

type AttackConfig struct {
	Concurrency    int
	RequestTimeout time.Duration
	RateLimitRPS   float64
	MaxBodyBytes   int
	UserAgent      string
}

type EvidenceConfig struct {
	BodyDiffThreshold int
	TimingTolerance   time.Duration
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

	maxDepth, err := strconv.Atoi(getEnv("DISCOVERY_MAX_DEPTH", "3"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid DISCOVERY_MAX_DEPTH: %w", err)
	}

	maxPages, err := strconv.Atoi(getEnv("DISCOVERY_MAX_PAGES", "50"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid DISCOVERY_MAX_PAGES: %w", err)
	}

	minVectorsRod, err := strconv.Atoi(getEnv("DISCOVERY_MIN_VECTORS_FOR_ROD", "2"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid DISCOVERY_MIN_VECTORS_FOR_ROD: %w", err)
	}

	concurrency, err := strconv.Atoi(getEnv("WORKER_ATTACK_CONCURRENCY", "5"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid WORKER_ATTACK_CONCURRENCY: %w", err)
	}

	rateLimit, err := strconv.ParseFloat(getEnv("ATTACK_RATE_LIMIT_RPS", "10"), 64)
	if err != nil {
		return Config{}, fmt.Errorf("invalid ATTACK_RATE_LIMIT_RPS: %w", err)
	}

	maxBody, err := strconv.Atoi(getEnv("ATTACK_MAX_BODY_BYTES", "1048576"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid ATTACK_MAX_BODY_BYTES: %w", err)
	}

	bodyDiff, err := strconv.Atoi(getEnv("EVIDENCE_BODY_DIFF_THRESHOLD", "100"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid EVIDENCE_BODY_DIFF_THRESHOLD: %w", err)
	}

	jobTimeout, err := time.ParseDuration(getEnv("WORKER_JOB_TIMEOUT", "30m"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid WORKER_JOB_TIMEOUT: %w", err)
	}

	pageTimeout, err := time.ParseDuration(getEnv("DISCOVERY_PAGE_TIMEOUT", "30s"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid DISCOVERY_PAGE_TIMEOUT: %w", err)
	}

	browserLaunchTimeout, err := time.ParseDuration(getEnv("DISCOVERY_BROWSER_LAUNCH_TIMEOUT", "90s"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid DISCOVERY_BROWSER_LAUNCH_TIMEOUT: %w", err)
	}

	reqTimeout, err := time.ParseDuration(getEnv("ATTACK_REQUEST_TIMEOUT", "15s"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid ATTACK_REQUEST_TIMEOUT: %w", err)
	}

	timingTol, err := time.ParseDuration(getEnv("EVIDENCE_TIMING_TOLERANCE", "2s"))
	if err != nil {
		return Config{}, fmt.Errorf("invalid EVIDENCE_TIMING_TOLERANCE: %w", err)
	}

	cfg := Config{
		RabbitMQ: RabbitMQConfig{
			Host:          getEnv("RABBITMQ_HOST", "localhost"),
			Port:          port,
			User:          getEnv("RABBITMQ_USER", "guest"),
			Password:      getEnv("RABBITMQ_PASSWORD", "guest"),
			VHost:         getEnv("RABBITMQ_VHOST", "/"),
			DispatchQueue: getEnv("RABBITMQ_ATTACKS_DISPATCH_QUEUE", "attacks.dispatch"),
			ResultsQueue:  getEnv("RABBITMQ_ATTACKS_RESULTS_QUEUE", "attacks.results"),
			PrefetchCount: prefetch,
		},
		Worker: WorkerConfig{
			JobTimeout: jobTimeout,
		},
		Discovery: DiscoveryConfig{
			MaxDepth:             maxDepth,
			MaxPages:             maxPages,
			PageTimeout:          pageTimeout,
			BrowserLaunchTimeout: browserLaunchTimeout,
			RodEnabled:           getEnv("DISCOVERY_ROD_ENABLED", "false") == "true",
			RodHeadless:          getEnv("DISCOVERY_ROD_HEADLESS", "true") == "true",
			RodNoSandbox:         getEnv("DISCOVERY_ROD_NO_SANDBOX", "false") == "true",
			ChromePath:           getEnv("CHROME_PATH", ""),
			MinVectorsForRod:     minVectorsRod,
		},
		Attack: AttackConfig{
			Concurrency:    concurrency,
			RequestTimeout: reqTimeout,
			RateLimitRPS:   rateLimit,
			MaxBodyBytes:   maxBody,
			UserAgent:      getEnv("ATTACK_USER_AGENT", "Shingeki-DAST-Worker/1.0"),
		},
		Evidence: EvidenceConfig{
			BodyDiffThreshold: bodyDiff,
			TimingTolerance:   timingTol,
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

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
