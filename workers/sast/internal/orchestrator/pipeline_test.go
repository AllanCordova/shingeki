package orchestrator

import (
	"context"
	"encoding/json"
	"log/slog"
	"testing"
	"time"

	"github.com/shingeki/sast-worker/internal/contracts"
	"github.com/shingeki/sast-worker/internal/repository"
	"github.com/shingeki/sast-worker/internal/scanner"
)

type stubPublisher struct {
	results     []contracts.ResultMessage
	completions []contracts.DispatchCompletionMessage
	resultErr   error
}

func (s *stubPublisher) PublishResult(_ context.Context, result contracts.ResultMessage) error {
	if s.resultErr != nil {
		return s.resultErr
	}
	s.results = append(s.results, result)
	return nil
}

func (s *stubPublisher) PublishCompletion(_ context.Context, completion contracts.DispatchCompletionMessage) error {
	s.completions = append(s.completions, completion)
	return nil
}

type stubScanner struct {
	findings []scanner.Finding
	err      error
}

func (s stubScanner) Scan(_ context.Context, _ string, _ []string) ([]scanner.Finding, error) {
	return s.findings, s.err
}

type stubCloner struct {
	dir string
	err error
}

func (s stubCloner) Clone(_ context.Context, _, _ string) (string, func(), error) {
	if s.err != nil {
		return "", nil, s.err
	}
	return s.dir, func() {}, nil
}

func testBatch() contracts.DispatchBatch {
	return contracts.DispatchBatch{
		Event:         contracts.EventDispatchBatch,
		ScanType:      contracts.ScanTypeSast,
		DispatchID:    "dispatch-1",
		SystemID:      "sys-1",
		UserID:        "user-1",
		RepositoryURL: "https://github.com/org/repo",
		Attacks: []contracts.AttackItem{
			{
				AttackID:       "atk-1",
				Category:       "SQL_INJECTION",
				TargetLocation: "SOURCE_CODE",
				Payload:        json.RawMessage(`{"languages":["php"]}`),
			},
		},
	}
}

func TestResolveRepositoryRequiresRepositoryURL(t *testing.T) {
	t.Parallel()

	p := &Pipeline{labRepositoryPath: ""}

	_, _, err := p.resolveRepository(context.Background(), "", "")
	if err == nil {
		t.Fatal("expected error when repository_url is empty and lab path is unset")
	}
}

func TestResolveRepositoryPrefersRepositoryURLOverLabPath(t *testing.T) {
	t.Parallel()

	p := &Pipeline{
		cloner:            repository.NewCloner(time.Second, ""),
		labRepositoryPath: "/lab/vulnerable-target",
		logger:            slog.Default(),
	}

	_, _, err := p.resolveRepository(context.Background(), "https://127.0.0.1/org/repo", "")
	if err == nil {
		t.Fatal("expected clone error instead of using lab path")
	}
}

func TestResolveRepositoryUsesLabPathWhenRepositoryURLEmpty(t *testing.T) {
	t.Parallel()

	p := &Pipeline{
		labRepositoryPath: "/lab/vulnerable-target",
		logger:            slog.Default(),
	}

	repoDir, cleanup, err := p.resolveRepository(context.Background(), "", "")
	if err != nil {
		t.Fatalf("expected lab fallback, got: %v", err)
	}
	defer cleanup()

	if repoDir != "/lab/vulnerable-target" {
		t.Fatalf("expected lab path, got %q", repoDir)
	}
}

func TestRunPublishesCompletionOnCloneFailure(t *testing.T) {
	t.Parallel()

	publisher := &stubPublisher{}
	p := &Pipeline{
		cloner:    stubCloner{err: context.DeadlineExceeded},
		publisher: publisher,
		logger:    slog.Default(),
	}

	err := p.Run(context.Background(), testBatch())
	if err == nil {
		t.Fatal("expected clone failure")
	}
	if len(publisher.completions) != 1 {
		t.Fatalf("expected completion on failure, got %d", len(publisher.completions))
	}
	if publisher.completions[0].FindingsCount != 0 {
		t.Fatalf("expected 0 findings, got %d", publisher.completions[0].FindingsCount)
	}
}

func TestRunPublishesCompletionAfterPartialPublish(t *testing.T) {
	t.Parallel()

	publisher := &stubPublisher{resultErr: context.Canceled}
	p := &Pipeline{
		cloner:    stubCloner{dir: "/tmp/repo"},
		scanner:   stubScanner{findings: []scanner.Finding{{CheckID: "php.lang.security.sql-injection", Path: "app.php", Line: 1, Message: "sqli"}}},
		publisher: publisher,
		logger:    slog.Default(),
	}

	err := p.Run(context.Background(), testBatch())
	if err == nil {
		t.Fatal("expected publish failure")
	}
	if len(publisher.completions) != 1 {
		t.Fatalf("expected completion after partial publish, got %d", len(publisher.completions))
	}
}

func TestRunPublishesFindingsAndCompletion(t *testing.T) {
	t.Parallel()

	publisher := &stubPublisher{}
	p := &Pipeline{
		cloner: stubCloner{dir: "/tmp/repo"},
		scanner: stubScanner{findings: []scanner.Finding{
			{CheckID: "php.lang.security.sql-injection", Path: "app.php", Line: 10, Message: "sqli"},
		}},
		publisher: publisher,
		logger:    slog.Default(),
	}

	if err := p.Run(context.Background(), testBatch()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(publisher.results) != 1 || len(publisher.completions) != 1 {
		t.Fatalf("expected 1 result and 1 completion, got %d results %d completions", len(publisher.results), len(publisher.completions))
	}
	if publisher.completions[0].FindingsCount != 1 {
		t.Fatalf("expected findings_count 1, got %d", publisher.completions[0].FindingsCount)
	}
}
