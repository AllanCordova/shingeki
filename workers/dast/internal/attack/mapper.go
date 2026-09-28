package attack

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func MapVectorsToJobs(vectors []contracts.AttackVector, attacks []contracts.AttackItem) []types.Job {
	var jobs []types.Job
	for _, vector := range vectors {
		for _, attackItem := range attacks {
			if strings.EqualFold(strings.TrimSpace(attackItem.Category), "SECRET_LEAK") {
				continue
			}
			if !locationCompatible(vector.TargetLocation, attackItem.TargetLocation) {
				continue
			}
			spec, err := parsePayload(attackItem.Payload)
			if err != nil {
				continue
			}

			for _, variant := range payloadVariants(spec) {
				jobs = append(jobs, jobsForVector(attackItem, vector, variant)...)
			}
		}
	}
	return jobs
}

func vectorJobKey(job types.Job) string {
	return job.Vector.Route + "\x00" + job.Vector.Method + "\x00" + job.Vector.TargetLocation
}

// CapJobs keeps at most max jobs, round-robin across vectors so late-seeded
// routes (e.g. /ftp/) are not dropped when the catalog×crawl product exceeds the cap.
func CapJobs(jobs []types.Job, max int) []types.Job {
	if max < 1 || len(jobs) <= max {
		return jobs
	}

	type bucket struct {
		jobs []types.Job
		next int
	}
	index := map[string]int{}
	var groups []bucket
	for _, job := range jobs {
		key := vectorJobKey(job)
		if i, ok := index[key]; ok {
			groups[i].jobs = append(groups[i].jobs, job)
			continue
		}
		index[key] = len(groups)
		groups = append(groups, bucket{jobs: []types.Job{job}})
	}

	out := make([]types.Job, 0, max)
	progress := true
	for progress && len(out) < max {
		progress = false
		for i := range groups {
			g := &groups[i]
			if g.next >= len(g.jobs) {
				continue
			}
			out = append(out, g.jobs[g.next])
			g.next++
			progress = true
			if len(out) >= max {
				break
			}
		}
	}
	return out
}

func jobsForVector(attackItem contracts.AttackItem, vector contracts.AttackVector, spec types.PayloadSpec) []types.Job {
	if spec.Field != "" {
		return []types.Job{{
			Attack:   attackItem,
			Vector:   vector,
			ParamKey: spec.Field,
			Payload:  spec,
		}}
	}

	if len(vector.Params) == 0 {
		return []types.Job{{
			Attack:   attackItem,
			Vector:   vector,
			ParamKey: "",
			Payload:  spec,
		}}
	}

	keys := make([]string, 0, len(vector.Params))
	for paramKey := range vector.Params {
		keys = append(keys, paramKey)
	}
	sort.Strings(keys)

	jobs := make([]types.Job, 0, len(keys))
	for _, paramKey := range keys {
		jobs = append(jobs, types.Job{
			Attack:   attackItem,
			Vector:   vector,
			ParamKey: paramKey,
			Payload:  spec,
		})
	}
	return jobs
}

func payloadVariants(spec types.PayloadSpec) []types.PayloadSpec {
	values := spec.Values
	if spec.Value != "" {
		seen := false
		for _, value := range values {
			if value == spec.Value {
				seen = true
				break
			}
		}
		if !seen {
			values = append([]string{spec.Value}, values...)
		}
	}
	if len(values) == 0 {
		return []types.PayloadSpec{spec}
	}

	out := make([]types.PayloadSpec, 0, len(values))
	for _, value := range values {
		next := spec
		next.Value = value
		out = append(out, next)
	}
	return out
}

func locationCompatible(vectorLocation, attackLocation string) bool {
	if vectorLocation == attackLocation {
		return true
	}
	if attackLocation == "API_ENDPOINT" && (vectorLocation == "JSON_BODY" || vectorLocation == "FORM") {
		return true
	}
	if attackLocation == "JSON_BODY" && vectorLocation == "API_ENDPOINT" {
		return true
	}
	if attackLocation == "HEADER" {
		return true
	}
	return false
}

func ApplyAuth(jobs []types.Job, auth *contracts.TargetAuth) []types.Job {
	if auth == nil {
		return jobs
	}
	headers := contracts.EffectiveAuthHeaders(auth)
	if len(auth.Cookies) == 0 {
		return ApplyGlobalHeaders(jobs, headers)
	}

	global := make(map[string]string, len(headers))
	for key, value := range headers {
		if strings.EqualFold(key, "Cookie") {
			continue
		}
		global[key] = value
	}
	jobs = ApplyGlobalHeaders(jobs, global)
	fallbackCookie := ""
	for key, value := range auth.Headers {
		if strings.EqualFold(key, "Cookie") {
			fallbackCookie = value
			break
		}
	}
	for i := range jobs {
		cookie := contracts.CookieHeaderForURL(auth.Cookies, jobs[i].Vector.Route)
		if cookie == "" {
			cookie = fallbackCookie
		}
		if cookie == "" {
			continue
		}
		if jobs[i].Vector.Headers == nil {
			jobs[i].Vector.Headers = map[string]string{}
		}
		jobs[i].Vector.Headers["Cookie"] = cookie
	}
	return jobs
}

func ApplyGlobalHeaders(jobs []types.Job, global map[string]string) []types.Job {
	if len(global) == 0 {
		return jobs
	}

	for i := range jobs {
		jobs[i].Vector.Headers = contracts.MergeHeaders(global, jobs[i].Vector.Headers)
	}

	return jobs
}

func parsePayload(raw json.RawMessage) (types.PayloadSpec, error) {
	var generic map[string]any
	if err := json.Unmarshal(raw, &generic); err != nil {
		return types.PayloadSpec{}, fmt.Errorf("decode payload: %w", err)
	}

	spec := types.PayloadSpec{RawJSON: raw}
	if value, ok := generic["value"].(string); ok {
		spec.Value = value
	}
	if field, ok := generic["field"].(string); ok {
		spec.Field = field
	}
	if spec.Field == "" {
		if parameter, ok := generic["parameter"].(string); ok {
			spec.Field = parameter
		}
	}
	if rawValues, ok := generic["values"].([]any); ok {
		for _, item := range rawValues {
			if value, ok := item.(string); ok && value != "" {
				spec.Values = append(spec.Values, value)
			}
		}
	}
	if spec.Value == "" && len(spec.Values) == 0 {
		return types.PayloadSpec{}, fmt.Errorf("payload missing value")
	}
	return spec, nil
}
