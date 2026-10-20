package orchestrator

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/discovery"
	"github.com/shingeki/dast-worker/internal/evidence"
	"github.com/shingeki/dast-worker/internal/secrets"
	"github.com/shingeki/dast-worker/pkg/httputil"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

const publishTimeout = 10 * time.Second

type resultPublisher interface {
	PublishProbe(ctx context.Context, probe contracts.ProbeMessage) error
	PublishResult(ctx context.Context, result contracts.ResultMessage) error
	PublishCompletion(ctx context.Context, completion contracts.DispatchCompletionMessage) error
}

type Pipeline struct {
	discovery    discovery.Engine
	attack       attack.Engine
	evidence     evidence.Validator
	secrets      secrets.Scanner
	publisher    resultPublisher
	logger       *slog.Logger
	ping         func(ctx context.Context, rawURL string) error
	guard        sessionGuard
	sessionBatch int
}

func NewPipeline(
	discoveryEngine discovery.Engine,
	attackEngine attack.Engine,
	evidenceEngine evidence.Validator,
	publisher resultPublisher,
	logger *slog.Logger,
) *Pipeline {
	if logger == nil {
		logger = slog.Default()
	}
	return &Pipeline{
		discovery:    discoveryEngine,
		attack:       attackEngine,
		evidence:     evidenceEngine,
		publisher:    publisher,
		logger:       logger,
		ping:         httputil.CheckReachable,
		guard:        newHTTPSessionGuard(),
		sessionBatch: 20,
	}
}

func (p *Pipeline) Run(ctx context.Context, batch contracts.DispatchBatch) (err error) {
	if closer, ok := p.evidence.(io.Closer); ok {
		defer func() { _ = closer.Close() }()
	}

	start := time.Now()
	findingsPublished := 0
	probesPublished := 0
	vectorsDiscovered := 0
	jobsPlanned := 0
	publishedFindings := map[string]struct{}{}

	defer func() {
		status := contracts.CompletionStatusCompleted
		errText := ""
		if errors.Is(err, contracts.ErrSessionExpired) {
			status = contracts.CompletionStatusSessionExpired
		} else if err != nil {
			status = contracts.CompletionStatusFailed
			errText = err.Error()
		}
		completion := contracts.DispatchCompletionMessage{
			Event:             contracts.EventDispatchCompleted,
			DispatchID:        batch.DispatchID,
			SystemID:          batch.SystemID,
			Status:            status,
			Error:             errText,
			DurationMs:        time.Since(start).Milliseconds(),
			FindingsCount:     findingsPublished,
			ProbesCount:       probesPublished,
			VectorsDiscovered: vectorsDiscovered,
			JobsPlanned:       jobsPlanned,
		}

		completeCtx, cancel := context.WithTimeout(context.Background(), publishTimeout)
		defer cancel()
		if pubErr := p.publisher.PublishCompletion(completeCtx, completion); pubErr != nil {
			p.logger.Error("failed to publish dispatch completion", "error", pubErr, "dispatch_id", batch.DispatchID)
		}
	}()

	p.logger.Info("starting pipeline",
		"system_id", batch.SystemID,
		"target", batch.TargetURL,
		"depth", batch.EffectiveDepth(),
		"start_path", batch.EffectiveStartPath(),
		"max_routes", batch.EffectiveMaxRoutes(),
		"route_map", len(batch.EffectiveRouteMap()),
	)

	targetURL := targeturl.Normalize(batch.TargetURL)
	if err = targeturl.AssertHTTP(targetURL); err != nil {
		return fmt.Errorf("target url: %w", err)
	}
	if targetURL != batch.TargetURL {
		p.logger.Info("normalized target url for worker reachability", "from", batch.TargetURL, "to", targetURL)
	}
	if p.ping != nil {
		if err = p.ping(ctx, targetURL); err != nil {
			return err
		}
	}
	if err = batch.Auth.MaterializeBrowserState(); err != nil {
		return fmt.Errorf("browser state: %w", err)
	}

	var vectors []contracts.AttackVector
	vectors, err = p.discovery.Discover(ctx, targetURL, batch.Auth, discovery.OptionsFromBatch(batch))
	if err != nil {
		return fmt.Errorf("discovery: %w", err)
	}
	vectorsDiscovered = len(vectors)
	p.logger.Info("discovery finished", "vectors", vectorsDiscovered)

	secretFindings, secretProbes, err := p.publishSecretLeaks(ctx, batch, targetURL, vectors)
	if err != nil {
		return err
	}
	findingsPublished += secretFindings
	probesPublished += secretProbes

	jobs := p.attack.MapVectorsToJobs(vectors, batch.Attacks)
	jobs = attack.ApplyAuth(jobs, batch.Auth, targetURL)
	jobsPlanned = len(jobs)
	p.logger.Info("mapped attack jobs", "jobs", jobsPlanned)

	controlURL, err := p.establishControl(ctx, targetURL, batch.Auth, vectors)
	if err != nil {
		return err
	}

	batchSize := len(jobs)
	if controlURL != "" {
		batchSize = p.sessionBatch
		if batchSize < 1 {
			batchSize = 20
		}
	}
	if batchSize < 1 {
		batchSize = 1
	}

	for start := 0; start < len(jobs); start += batchSize {
		if start > 0 && controlURL != "" {
			expired, checkErr := p.guard.Expired(ctx, targetURL, controlURL, batch.Auth)
			if checkErr != nil {
				return fmt.Errorf("session control: %w", checkErr)
			}
			if expired {
				return contracts.ErrSessionExpired
			}
		}
		end := start + batchSize
		if end > len(jobs) {
			end = len(jobs)
		}
		responses := p.attack.ExecutePool(ctx, jobs[start:end])
		for _, response := range responses {
			if response.Skipped {
				if err = p.publishProbe(skippedProbe(batch, response)); err != nil {
					return err
				}
				probesPublished++
				continue
			}

			if response.Error != nil && !response.TimedOut {
				p.logger.Warn("attack job failed",
					"attack_id", response.Job.Attack.AttackID,
					"route", response.Job.Vector.Route,
					"error", response.Error,
				)
				if err = p.publishProbe(errorProbe(batch, response)); err != nil {
					return err
				}
				probesPublished++
				continue
			}

			finding := p.evidence.Analyze(ctx, response)
			if response.Error != nil && finding == nil {
				if err = p.publishProbe(errorProbe(batch, response)); err != nil {
					return err
				}
				probesPublished++
				continue
			}

			outcome := "clean"
			evidenceText := fmt.Sprintf("HTTP %d · nenhum indicador detectado", response.AttackStatus)

			if finding != nil {
				outcome = "vulnerable"
				evidenceText = finding.Evidence
				finding.VulnerableRoute = targeturl.CanonicalSinkRoute(finding.VulnerableRoute)

				key := findingIdentity(finding.AttackID, finding.VulnerableRoute)
				if _, exists := publishedFindings[key]; !exists {
					result := finding.ToResultMessage(batch.DispatchID, batch.SystemID)
					if err = p.publishResult(result); err != nil {
						return err
					}
					publishedFindings[key] = struct{}{}
					findingsPublished++
				}
			}

			probe := contracts.ProbeMessage{
				Event:       contracts.EventAttackProbe,
				DispatchID:  batch.DispatchID,
				SystemID:    batch.SystemID,
				AttackID:    response.Job.Attack.AttackID,
				Route:       response.Job.Vector.Route,
				PayloadUsed: response.PayloadUsed,
				HTTPRequest: response.RawRequest,
				Outcome:     outcome,
				Evidence:    evidenceText,
			}
			if err = p.publishProbe(probe); err != nil {
				return err
			}
			probesPublished++
		}
	}

	p.logger.Info("pipeline finished",
		"system_id", batch.SystemID,
		"findings", findingsPublished,
		"probes", probesPublished,
		"duration_ms", time.Since(start).Milliseconds(),
	)

	return nil
}

func (p *Pipeline) establishControl(ctx context.Context, targetURL string, auth *contracts.TargetAuth, vectors []contracts.AttackVector) (string, error) {
	if p.guard == nil || !auth.HasSession() {
		return "", nil
	}
	candidates := make([]string, 0, 1+len(vectors))
	candidates = append(candidates, targetURL)
	for _, vector := range vectors {
		candidates = append(candidates, vector.Route)
	}
	controlURL, err := p.guard.Establish(ctx, targetURL, auth, candidates)
	if err != nil {
		return "", err
	}
	return controlURL, nil
}

func (p *Pipeline) publishProbe(probe contracts.ProbeMessage) error {
	ctx, cancel := context.WithTimeout(context.Background(), publishTimeout)
	defer cancel()
	if err := p.publisher.PublishProbe(ctx, probe); err != nil {
		return fmt.Errorf("publish probe: %w", err)
	}
	return nil
}

func (p *Pipeline) publishResult(result contracts.ResultMessage) error {
	ctx, cancel := context.WithTimeout(context.Background(), publishTimeout)
	defer cancel()
	if err := p.publisher.PublishResult(ctx, result); err != nil {
		return fmt.Errorf("publish result: %w", err)
	}
	return nil
}

func (p *Pipeline) publishSecretLeaks(
	ctx context.Context,
	batch contracts.DispatchBatch,
	targetURL string,
	vectors []contracts.AttackVector,
) (int, int, error) {
	attackID := secretLeakAttackID(batch.Attacks)
	if attackID == "" {
		return 0, 0, nil
	}

	scanner := p.secrets
	if scanner == nil {
		scanner = secrets.NewHTTPScanner()
	}
	hits, err := scanner.Scan(ctx, targetURL, vectors, batch.Auth)
	if err != nil {
		p.logger.Warn("secret leak scan failed", "error", err)
		probe := contracts.ProbeMessage{
			Event:        contracts.EventAttackProbe,
			DispatchID:   batch.DispatchID,
			SystemID:     batch.SystemID,
			AttackID:     attackID,
			Route:        strings.TrimRight(targetURL, "/") + "/api/config",
			PayloadUsed:  "passive",
			HTTPRequest:  "GET " + targetURL,
			Outcome:      "error",
			Evidence:     "Falha ao executar teste",
			ErrorMessage: err.Error(),
		}
		if pubErr := p.publishProbe(probe); pubErr != nil {
			return 0, 0, pubErr
		}
		return 0, 1, nil
	}

	findings := 0
	seenToken := map[string]struct{}{}
	for _, hit := range hits {
		tokenKey := hit.Kind + "\x00" + hit.Value
		if _, exists := seenToken[tokenKey]; exists {
			continue
		}
		seenToken[tokenKey] = struct{}{}
		result := contracts.ResultMessage{
			DispatchID:      batch.DispatchID,
			AttackID:        attackID,
			SystemID:        batch.SystemID,
			VulnerableRoute: hit.Route,
			PayloadUsed:     hit.Kind,
			Evidence:        secrets.Evidence(hit),
			HTTPRequest:     hit.Request,
		}
		if pubErr := p.publishResult(result); pubErr != nil {
			return findings, 0, pubErr
		}
		findings++
	}

	outcome := "clean"
	evidenceText := "Nenhum token comum vazado nas respostas same-origin."
	if findings > 0 {
		outcome = "vulnerable"
		evidenceText = fmt.Sprintf("%d token(s) leaked in browser-reachable responses", findings)
	}
	probe := contracts.ProbeMessage{
		Event:       contracts.EventAttackProbe,
		DispatchID:  batch.DispatchID,
		SystemID:    batch.SystemID,
		AttackID:    attackID,
		Route:       strings.TrimRight(targetURL, "/") + "/api/config",
		PayloadUsed: "passive",
		HTTPRequest: "GET " + targetURL,
		Outcome:     outcome,
		Evidence:    evidenceText,
	}
	if pubErr := p.publishProbe(probe); pubErr != nil {
		return findings, 0, pubErr
	}
	return findings, 1, nil
}

func secretLeakAttackID(attacks []contracts.AttackItem) string {
	for _, attackItem := range attacks {
		if strings.EqualFold(strings.TrimSpace(attackItem.Category), "SECRET_LEAK") {
			return attackItem.AttackID
		}
	}
	return ""
}

func findingIdentity(attackID, route string) string {
	return attackID + "\x00" + targeturl.CanonicalSinkRoute(route)
}

func skippedProbe(batch contracts.DispatchBatch, response types.Response) contracts.ProbeMessage {
	return contracts.ProbeMessage{
		Event:       contracts.EventAttackProbe,
		DispatchID:  batch.DispatchID,
		SystemID:    batch.SystemID,
		AttackID:    response.Job.Attack.AttackID,
		Route:       response.Job.Vector.Route,
		PayloadUsed: response.PayloadUsed,
		Outcome:     "clean",
		Evidence:    "rota pública sem autenticação; JWT_CONFUSION não testado",
	}
}

func errorProbe(batch contracts.DispatchBatch, response types.Response) contracts.ProbeMessage {
	errText := ""
	if response.Error != nil {
		errText = response.Error.Error()
	}
	return contracts.ProbeMessage{
		Event:        contracts.EventAttackProbe,
		DispatchID:   batch.DispatchID,
		SystemID:     batch.SystemID,
		AttackID:     response.Job.Attack.AttackID,
		Route:        response.Job.Vector.Route,
		PayloadUsed:  response.PayloadUsed,
		HTTPRequest:  response.RawRequest,
		Outcome:      "error",
		Evidence:     "Falha ao executar teste",
		ErrorMessage: errText,
	}
}
