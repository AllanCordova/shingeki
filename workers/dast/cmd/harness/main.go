package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"time"

	"github.com/shingeki/dast-worker/internal/goldset"
)

func main() {
	fixture := flag.String("fixture", "", "in-process goldset: secrets | access | inject")
	flag.Parse()

	if *fixture == "" {
		fmt.Fprintf(os.Stderr, "usage: harness -fixture secrets|access|inject\n")
		os.Exit(2)
	}

	var handler http.Handler
	var evaluate func(ctx context.Context, origin string) (goldset.Report, error)
	switch *fixture {
	case "secrets":
		handler = goldset.ReactLeakHandler()
		evaluate = goldset.EvaluateReactLeaks
	case "access":
		handler = goldset.AccessHandler()
		evaluate = goldset.EvaluateAccess
	case "inject":
		handler = goldset.InjectHandler()
		evaluate = goldset.EvaluateInject
	default:
		fmt.Fprintf(os.Stderr, "unknown fixture %q (secrets|access|inject)\n", *fixture)
		os.Exit(2)
	}

	server := httptest.NewServer(handler)
	defer server.Close()
	fmt.Fprintf(os.Stderr, "dast harness → fixture %s %s\n", *fixture, server.URL)

	report, err := evaluate(context.Background(), server.URL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "harness failed: %v\n", err)
		os.Exit(2)
	}
	printReport(report)
	if len(report.Missing()) > 0 {
		os.Exit(1)
	}
}

func printReport(report goldset.Report) {
	fmt.Printf("target\t%s\n", report.Target)
	fmt.Printf("jobs\t%d\n", report.Jobs)
	fmt.Printf("duration\t%s\n", report.Duration.Round(time.Millisecond))
	for _, hit := range report.Hits {
		fmt.Printf("HIT\t%s\t%s\t%s\n", hit.Challenge, hit.Route, hit.Evidence)
	}
	for _, extra := range report.Unexpected {
		fmt.Printf("EXTRA\t%s\t%s\n", extra.Route, extra.Evidence)
	}
	for _, name := range report.Missing() {
		fmt.Printf("MISS\t%s\n", name)
	}
}
