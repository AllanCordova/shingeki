package evidence

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/shingeki/dast-worker/internal/attack/injectors"
	"github.com/shingeki/dast-worker/internal/attack/types"
)

const xxeEntityCanary = "zzentityprobe"

// XXEValidator confirms external-entity file leaks, and otherwise checks whether
// a declared entity is expanded into a field the application actually uses.
// The check compares a known value with a canary, literally and through an
// internal entity. It does not depend on a particular error string or host.
type XXEValidator struct {
	client *http.Client

	mu       sync.Mutex
	tested   map[string]struct{}
	reported map[string]struct{}
}

func NewXXEValidator() *XXEValidator {
	return &XXEValidator{
		client:   &http.Client{Timeout: 8 * time.Second},
		tested:   map[string]struct{}{},
		reported: map[string]struct{}{},
	}
}

func (v *XXEValidator) Analyze(ctx context.Context, response types.Response) *Finding {
	if !strings.Contains(strings.ToUpper(response.Job.Attack.Category), "XXE") {
		return nil
	}
	attackLower := strings.ToLower(response.AttackBody)
	baselineLower := strings.ToLower(response.BaselineBody)
	for _, marker := range pathTraversalMarkers {
		markerLower := strings.ToLower(marker)
		if strings.Contains(attackLower, markerLower) && !strings.Contains(baselineLower, markerLower) {
			return newFinding(response, "XXE payload leaked local file content")
		}
	}
	return v.entityExpansion(ctx, response)
}

func (v *XXEValidator) entityExpansion(ctx context.Context, response types.Response) *Finding {
	if xmlLocation(response) != "XML_BODY" {
		return nil
	}
	key := strings.TrimSpace(response.Job.ParamKey)
	sample := strings.TrimSpace(response.Job.Vector.Params[key])
	route := strings.TrimSpace(response.Job.Vector.Route)
	if key == "" || sample == "" || route == "" || len(sample) > 64 || strings.ContainsAny(sample, "<>&\"") {
		return nil
	}
	canary := xxeEntityCanary
	if sample == canary {
		canary += "x"
	}

	v.mu.Lock()
	defer v.mu.Unlock()
	if _, ok := v.reported[route]; ok {
		return nil
	}
	fieldKey := route + "\n" + key
	if _, ok := v.tested[fieldKey]; ok {
		return nil
	}

	litCanary, ok := v.observe(ctx, response.Job, key, canary, false)
	entSample, okSample := v.observe(ctx, response.Job, key, sample, true)
	entCanary, okCanary := v.observe(ctx, response.Job, key, canary, true)
	if !ok || !okSample || !okCanary {
		return nil
	}
	v.tested[fieldKey] = struct{}{}

	literalSample := effect{status: response.BaselineStatus, body: response.BaselineBody}
	if !sameEffect(literalSample, entSample) || !sameEffect(litCanary, entCanary) || sameEffect(literalSample, litCanary) {
		return nil
	}
	v.reported[route] = struct{}{}
	return newFinding(response, "XML parser expanded a declared entity into a field the application used")
}

type effect struct {
	status int
	body   string
}

func (v *XXEValidator) observe(ctx context.Context, job types.Job, key, value string, internal bool) (effect, bool) {
	spec, err := injectors.BuildXMLProbe(job, key, value, internal)
	if err != nil {
		return effect{}, false
	}
	status, body, err := sendSpec(ctx, v.client, spec)
	if err != nil || status == 0 {
		return effect{}, false
	}
	return effect{status: status, body: body}, true
}

func xmlLocation(response types.Response) string {
	if response.Job.Attack.TargetLocation != "" {
		return response.Job.Attack.TargetLocation
	}
	return response.Job.Vector.TargetLocation
}

var effectDigits = regexp.MustCompile(`\d+`)
var effectSpace = regexp.MustCompile(`\s+`)

func sameEffect(left, right effect) bool {
	if left.status == 0 || left.status != right.status {
		return false
	}
	return normalizeEffect(left.body) == normalizeEffect(right.body)
}

func normalizeEffect(body string) string {
	body = effectDigits.ReplaceAllString(body, "0")
	body = effectSpace.ReplaceAllString(body, " ")
	return strings.TrimSpace(body)
}
