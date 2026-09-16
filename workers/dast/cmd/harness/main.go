package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/shingeki/dast-worker/internal/goldset"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func main() {
	target := flag.String("target", "http://127.0.0.1:3001", "Juice Shop base URL")
	domXSS := flag.Bool("dom-xss", false, "also confirm DOM XSS in Chromium (still seconds, needs Chrome)")
	auth := flag.Bool("auth", false, "authenticated gold set: IDOR basket, admin users, reviews")
	coverage := flag.Bool("coverage", false, "coverage gold set: open redirect, JWT none, /ftp")
	email := flag.String("email", goldset.DefaultAdminEmail, "Juice Shop login used with -auth/-coverage")
	password := flag.String("password", goldset.DefaultAdminPassword, "Juice Shop password used with -auth/-coverage")
	timeout := flag.Duration("timeout", 45*time.Second, "overall harness timeout")
	flag.Parse()

	if os.Getenv("CHROME_PATH") == "" {
		if _, err := os.Stat("/usr/bin/google-chrome"); err == nil {
			_ = os.Setenv("CHROME_PATH", "/usr/bin/google-chrome")
		} else if _, err := os.Stat("/usr/bin/chromium"); err == nil {
			_ = os.Setenv("CHROME_PATH", "/usr/bin/chromium")
		}
	}

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))
	targetURL := targeturl.Normalize(*target)

	fmt.Fprintf(os.Stderr, "dast harness → %s (dom-xss=%v auth=%v coverage=%v)\n", targetURL, *domXSS, *auth, *coverage)

	report, err := goldset.Evaluate(context.Background(), targetURL, goldset.Options{
		Rod:      *domXSS && !*auth && !*coverage,
		Auth:     *auth && !*coverage,
		Coverage: *coverage,
		Email:    *email,
		Password: *password,
		Timeout:  *timeout,
		Logger:   logger,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "harness failed: %v\n", err)
		os.Exit(2)
	}

	fmt.Printf("target\t%s\n", report.Target)
	fmt.Printf("jobs\t%d\n", report.Jobs)
	fmt.Printf("duration\t%s\n", report.Duration.Round(time.Millisecond))
	for _, hit := range report.Hits {
		fmt.Printf("HIT\t%s\t%s\t%s\n", hit.Challenge, hit.Route, hit.Evidence)
	}
	for _, extra := range report.Unexpected {
		fmt.Printf("EXTRA\t%s\t%s\n", extra.Route, extra.Evidence)
	}
	missing := report.Missing()
	for _, name := range missing {
		fmt.Printf("MISS\t%s\n", name)
	}

	if len(missing) > 0 {
		os.Exit(1)
	}
}
