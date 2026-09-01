package orchestrator

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery"
	"github.com/shingeki/dast-worker/internal/evidence"
)

type stubDiscovery struct {
	vectors []contracts.AttackVector
	err     error
}

func (s stubDiscovery) Discover(
	_ context.Context,
	_ string,
	_ *contracts.TargetAuth,
	_ discovery.Options,
) ([]contracts.AttackVector, error) {
	return s.vectors, s.err
}

type stubAttack struct {
	jobs      []types.Job
	responses []types.Response
}

func (s stubAttack) MapVectorsToJobs(_ []contracts.AttackVector, _ []contracts.AttackItem) []types.Job {
	return s.jobs
}

func (s stubAttack) ExecutePool(_ context.Context, _ []types.Job) []types.Response {
	return s.responses
}

type stubPublisher struct {
	probes      []contracts.ProbeMessage
	results     []contracts.ResultMessage
	completions []contracts.DispatchCompletionMessage
}

func (s *stubPublisher) PublishProbe(_ context.Context, probe contracts.ProbeMessage) error {
	s.probes = append(s.probes, probe)
	return nil
}

func (s *stubPublisher) PublishResult(_ context.Context, result contracts.ResultMessage) error {
	s.results = append(s.results, result)
	return nil
}

func (s *stubPublisher) PublishCompletion(_ context.Context, completion contracts.DispatchCompletionMessage) error {
	s.completions = append(s.completions, completion)
	return nil
}

type alwaysFinding struct{}

func (alwaysFinding) Analyze(_ context.Context, response types.Response) *evidence.Finding {
	return &evidence.Finding{
		AttackID:        response.Job.Attack.AttackID,
		VulnerableRoute: response.Job.Vector.Route,
		PayloadUsed:     response.PayloadUsed,
		Evidence:        "test finding",
		HTTPRequest:     response.RawRequest,
	}
}

func testBatch() contracts.DispatchBatch {
	return contracts.DispatchBatch{
		Event:      contracts.EventDispatchBatch,
		DispatchID: "dispatch-1",
		SystemID:   "system-1",
		UserID:     "user-1",
		TargetURL:  "https://target.example",
		Attacks: []contracts.AttackItem{
			{
				AttackID:       "atk-1",
				Category:       "SQL_INJECTION",
				TargetLocation: "FORM",
				Payload:        []byte(`{"value":"' OR 1=1 --"}`),
			},
		},
	}
}

func TestPipelinePublishesFindingProbeAndCompletion(t *testing.T) {
	t.Parallel()

	job := types.Job{
		Attack:  contracts.AttackItem{AttackID: "atk-1", Category: "SQL_INJECTION", TargetLocation: "FORM"},
		Vector:  contracts.AttackVector{Route: "https://target.example/login"},
		Payload: types.PayloadSpec{Value: "' OR 1=1 --"},
	}
	publisher := &stubPublisher{}
	pipeline := NewPipeline(
		stubDiscovery{vectors: []contracts.AttackVector{job.Vector}},
		stubAttack{
			jobs: []types.Job{job},
			responses: []types.Response{{
				Job:          job,
				AttackStatus: 200,
				AttackBody:   "You have an error in your SQL syntax",
				PayloadUsed:  job.Payload.Value,
				RawRequest:   "POST /login HTTP/1.1",
			}},
		},
		alwaysFinding{},
		publisher,
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)

	if err := pipeline.Run(context.Background(), testBatch()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(publisher.results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(publisher.results))
	}
	if len(publisher.probes) != 1 || publisher.probes[0].Outcome != "vulnerable" {
		t.Fatalf("expected vulnerable probe, got %+v", publisher.probes)
	}
	if len(publisher.completions) != 1 || publisher.completions[0].FindingsCount != 1 {
		t.Fatalf("expected completion with 1 finding, got %+v", publisher.completions)
	}
	if publisher.completions[0].Status != contracts.CompletionStatusCompleted {
		t.Fatalf("expected completed status, got %q", publisher.completions[0].Status)
	}
}

func TestPipelinePublishesCompletionWhenDiscoveryFails(t *testing.T) {
	t.Parallel()

	publisher := &stubPublisher{}
	pipeline := NewPipeline(
		stubDiscovery{err: errors.New("offline")},
		stubAttack{},
		alwaysFinding{},
		publisher,
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)

	if err := pipeline.Run(context.Background(), testBatch()); err == nil {
		t.Fatal("expected discovery error")
	}
	if len(publisher.completions) != 1 {
		t.Fatalf("expected completion after discovery failure, got %d", len(publisher.completions))
	}
	if publisher.completions[0].Status != contracts.CompletionStatusFailed {
		t.Fatalf("expected failed status, got %q", publisher.completions[0].Status)
	}
	if publisher.completions[0].Error == "" {
		t.Fatal("expected failure error on completion")
	}
}

func TestPipelineRejectsUnsafeTargetURL(t *testing.T) {
	t.Parallel()

	publisher := &stubPublisher{}
	pipeline := NewPipeline(stubDiscovery{}, stubAttack{}, alwaysFinding{}, publisher, slog.New(slog.NewTextHandler(io.Discard, nil)))
	batch := testBatch()
	batch.TargetURL = "file:///etc/passwd"

	if err := pipeline.Run(context.Background(), batch); err == nil {
		t.Fatal("expected unsafe target url error")
	}
	if len(publisher.completions) != 1 {
		t.Fatalf("expected completion even for rejected url, got %d", len(publisher.completions))
	}
}
