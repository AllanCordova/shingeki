package orchestrator

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"strings"
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

func newTestPipeline(
	discoveryEngine stubDiscovery,
	attackEngine stubAttack,
	evidenceEngine evidence.Validator,
	publisher *stubPublisher,
) *Pipeline {
	pipeline := NewPipeline(
		discoveryEngine,
		attackEngine,
		evidenceEngine,
		publisher,
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)
	pipeline.ping = func(context.Context, string) error { return nil }
	return pipeline
}

func TestPipelinePublishesFindingProbeAndCompletion(t *testing.T) {
	t.Parallel()

	job := types.Job{
		Attack:  contracts.AttackItem{AttackID: "atk-1", Category: "SQL_INJECTION", TargetLocation: "FORM"},
		Vector:  contracts.AttackVector{Route: "https://target.example/login"},
		Payload: types.PayloadSpec{Value: "' OR 1=1 --"},
	}
	publisher := &stubPublisher{}
	pipeline := newTestPipeline(
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

func TestPipelineSkipsPublicJWTWithoutFinding(t *testing.T) {
	t.Parallel()

	job := types.Job{
		Attack:  contracts.AttackItem{AttackID: "atk-jwt", Category: "JWT_CONFUSION", TargetLocation: "HEADER"},
		Vector:  contracts.AttackVector{Route: "https://ajuda.example/hc/article"},
		Payload: types.PayloadSpec{Value: "none"},
	}
	publisher := &stubPublisher{}
	pipeline := newTestPipeline(
		stubDiscovery{vectors: []contracts.AttackVector{job.Vector}},
		stubAttack{
			jobs: []types.Job{job},
			responses: []types.Response{{
				Job:         job,
				PayloadUsed: job.Payload.Value,
				Skipped:     true,
			}},
		},
		alwaysFinding{},
		publisher,
	)

	if err := pipeline.Run(context.Background(), testBatch()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(publisher.results) != 0 {
		t.Fatalf("public route must not publish a finding, got %+v", publisher.results)
	}
	if len(publisher.probes) != 1 || publisher.probes[0].Outcome != "clean" {
		t.Fatalf("expected clean skip probe, got %+v", publisher.probes)
	}
	if publisher.completions[0].FindingsCount != 0 {
		t.Fatalf("expected 0 findings, got %+v", publisher.completions[0])
	}
}

func TestPipelinePublishesCompletionWhenDiscoveryFails(t *testing.T) {
	t.Parallel()

	publisher := &stubPublisher{}
	pipeline := newTestPipeline(
		stubDiscovery{err: errors.New("offline")},
		stubAttack{},
		alwaysFinding{},
		publisher,
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

func TestPipelineDedupesFindingsOnSameQuerySink(t *testing.T) {
	t.Parallel()

	attackItem := contracts.AttackItem{AttackID: "atk-xss", Category: "XSS", TargetLocation: "QUERY_PARAMETER"}
	jobA := types.Job{
		Attack:  attackItem,
		Vector:  contracts.AttackVector{Route: "http://127.0.0.1:3010/preview?q=", Method: "GET", TargetLocation: "QUERY_PARAMETER"},
		Payload: types.PayloadSpec{Value: "<script>alert(1)</script>"},
	}
	jobB := types.Job{
		Attack:  attackItem,
		Vector:  contracts.AttackVector{Route: "http://127.0.0.1:3010/preview?q=hoje", Method: "GET", TargetLocation: "QUERY_PARAMETER"},
		Payload: types.PayloadSpec{Value: "<img src=x onerror=alert(1)>"},
	}
	publisher := &stubPublisher{}
	pipeline := newTestPipeline(
		stubDiscovery{vectors: []contracts.AttackVector{jobA.Vector, jobB.Vector}},
		stubAttack{
			jobs: []types.Job{jobA, jobB},
			responses: []types.Response{
				{Job: jobA, AttackStatus: 200, PayloadUsed: jobA.Payload.Value, RawRequest: "GET /preview?q="},
				{Job: jobB, AttackStatus: 200, PayloadUsed: jobB.Payload.Value, RawRequest: "GET /preview?q=hoje"},
			},
		},
		alwaysFinding{},
		publisher,
	)

	if err := pipeline.Run(context.Background(), testBatch()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(publisher.results) != 1 {
		t.Fatalf("expected 1 finding, got %d", len(publisher.results))
	}
	if publisher.results[0].VulnerableRoute != "http://127.0.0.1:3010/preview?q=" {
		t.Fatalf("route=%s", publisher.results[0].VulnerableRoute)
	}
	if len(publisher.probes) != 2 {
		t.Fatalf("expected both probes, got %d", len(publisher.probes))
	}
	if publisher.completions[0].FindingsCount != 1 {
		t.Fatalf("findings_count=%d", publisher.completions[0].FindingsCount)
	}
}

func TestPipelineRejectsUnsafeTargetURL(t *testing.T) {
	t.Parallel()

	publisher := &stubPublisher{}
	pipeline := newTestPipeline(stubDiscovery{}, stubAttack{}, alwaysFinding{}, publisher)
	batch := testBatch()
	batch.TargetURL = "file:///etc/passwd"

	if err := pipeline.Run(context.Background(), batch); err == nil {
		t.Fatal("expected unsafe target url error")
	}
	if len(publisher.completions) != 1 {
		t.Fatalf("expected completion even for rejected url, got %d", len(publisher.completions))
	}
}

func TestPipelineFailsWhenTargetUnreachable(t *testing.T) {
	t.Parallel()

	publisher := &stubPublisher{}
	pipeline := newTestPipeline(stubDiscovery{vectors: []contracts.AttackVector{
		contracts.NewAttackVector("https://target.example/", "GET", "URL_PATH"),
	}}, stubAttack{}, alwaysFinding{}, publisher)
	pipeline.ping = func(context.Context, string) error {
		return errors.New("target unreachable: connect: connection refused")
	}

	if err := pipeline.Run(context.Background(), testBatch()); err == nil {
		t.Fatal("expected unreachable target error")
	} else if !strings.Contains(err.Error(), "connection refused") {
		t.Fatalf("error=%v", err)
	}
	if len(publisher.results) != 0 || len(publisher.probes) != 0 {
		t.Fatalf("expected no probes on unreachable target, results=%d probes=%d", len(publisher.results), len(publisher.probes))
	}
	if len(publisher.completions) != 1 || publisher.completions[0].Status != contracts.CompletionStatusFailed {
		t.Fatalf("expected failed completion, got %+v", publisher.completions)
	}
}

type noFinding struct{}

func (noFinding) Analyze(context.Context, types.Response) *evidence.Finding {
	return nil
}

type batchAttack struct {
	calls int
}

func (b *batchAttack) MapVectorsToJobs(_ []contracts.AttackVector, _ []contracts.AttackItem) []types.Job {
	job := func(path string) types.Job {
		return types.Job{
			Attack:  contracts.AttackItem{AttackID: "atk-1", Category: "SQL_INJECTION", TargetLocation: "QUERY_PARAMETER"},
			Vector:  contracts.AttackVector{Route: "https://target.example" + path},
			Payload: types.PayloadSpec{Value: "payload"},
		}
	}
	return []types.Job{job("/a"), job("/b")}
}

func (b *batchAttack) ExecutePool(_ context.Context, jobs []types.Job) []types.Response {
	b.calls++
	out := make([]types.Response, len(jobs))
	for i, job := range jobs {
		out[i] = types.Response{
			Job:          job,
			AttackStatus: 401,
			PayloadUsed:  job.Payload.Value,
		}
	}
	return out
}

type scriptedGuard struct {
	expired bool
	checks  int
}

func (g *scriptedGuard) Establish(context.Context, string, *contracts.TargetAuth, []string) (string, error) {
	return "https://target.example/", nil
}

func (g *scriptedGuard) Expired(context.Context, string, string, *contracts.TargetAuth) (bool, error) {
	g.checks++
	return g.expired, nil
}

func sessionBatch() contracts.DispatchBatch {
	batch := testBatch()
	batch.Auth = &contracts.TargetAuth{
		Type: "cookie",
		Cookies: []contracts.CapturedCookie{{
			Name:   "sid",
			Value:  "secret",
			Domain: "target.example",
			Path:   "/",
		}},
	}
	return batch
}

func TestPipelineProbeUnauthorizedDoesNotExpireSession(t *testing.T) {
	publisher := &stubPublisher{}
	attackEngine := &batchAttack{}
	pipeline := newTestPipeline(
		stubDiscovery{vectors: []contracts.AttackVector{contracts.NewAttackVector("https://target.example/", "GET", "URL_PATH")}},
		stubAttack{},
		noFinding{},
		publisher,
	)
	pipeline.attack = attackEngine
	pipeline.guard = &scriptedGuard{}
	pipeline.sessionBatch = 1

	if err := pipeline.Run(context.Background(), sessionBatch()); err != nil {
		t.Fatalf("probe 401 must not stop the scan: %v", err)
	}
	if attackEngine.calls != 2 {
		t.Fatalf("calls=%d", attackEngine.calls)
	}
	if publisher.completions[0].Status != contracts.CompletionStatusCompleted {
		t.Fatalf("status=%s", publisher.completions[0].Status)
	}
}

func TestPipelineControlUnauthorizedExpiresSession(t *testing.T) {
	publisher := &stubPublisher{}
	attackEngine := &batchAttack{}
	pipeline := newTestPipeline(
		stubDiscovery{vectors: []contracts.AttackVector{contracts.NewAttackVector("https://target.example/", "GET", "URL_PATH")}},
		stubAttack{},
		noFinding{},
		publisher,
	)
	pipeline.attack = attackEngine
	pipeline.guard = &scriptedGuard{expired: true}
	pipeline.sessionBatch = 1

	err := pipeline.Run(context.Background(), sessionBatch())
	if !errors.Is(err, contracts.ErrSessionExpired) {
		t.Fatalf("got %v", err)
	}
	if attackEngine.calls != 1 {
		t.Fatalf("calls=%d", attackEngine.calls)
	}
	if len(publisher.probes) != 1 {
		t.Fatalf("probes=%d", len(publisher.probes))
	}
	if publisher.completions[0].Status != contracts.CompletionStatusSessionExpired {
		t.Fatalf("status=%s", publisher.completions[0].Status)
	}
}
