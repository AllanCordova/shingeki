package attack

import (
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
)

// xssCoveragePayloads are tried before the rest of the catalog so a job cap
// still hits a different sink with each of the first payloads.
var xssCoveragePayloads = []string{
	`--></script></title></textarea></style><script>alert(1)</script>`,
	`<img src=x onerror=alert(1)>`,
	`"><script>alert(1)</script>`,
	`javascript:alert(1)`,
	`'-alert(1)-'`,
	`constructor.constructor("alert(1)")()`,
	`{{constructor.constructor("alert(1)")()}}`,
	`alert(1)`,
}

// browserDOMPayloads are applied in the browser on pages that have no query
// parameter. innerHTML needs a tag, eval needs a call, URL sinks need a javascript URL.
var browserDOMPayloads = []string{
	`<img/src=x/onerror=alert(1)>`,
	`alert(1)`,
	`javascript:alert(1)`,
}

func MapVectorsToJobs(vectors []contracts.AttackVector, attacks []contracts.AttackItem) []types.Job {
	var jobs []types.Job
	for _, vector := range vectors {
		for _, attackItem := range attacks {
			if strings.EqualFold(strings.TrimSpace(attackItem.Category), "SECRET_LEAK") {
				continue
			}
			if isXSSQuery(attackItem) {
				jobs = append(jobs, browserDOMJobs(attackItem, vector)...)
			}
			if !locationCompatible(vector.TargetLocation, attackItem.TargetLocation) {
				continue
			}
			spec, err := parsePayload(attackItem.Payload)
			if err != nil {
				continue
			}

			variants := payloadVariants(spec)
			if isXSS(attackItem) {
				variants = prioritizeVariants(variants, append(routeSinkPayloads(vector.Route), xssCoveragePayloads...))
			}
			for _, variant := range variants {
				jobs = append(jobs, jobsForVector(attackItem, vector, variant)...)
			}
		}
	}
	return jobs
}

func vectorJobKey(job types.Job) string {
	return job.Vector.Route + "\x00" + job.Vector.Method + "\x00" + job.Vector.TargetLocation + "\x00" + job.Attack.AttackID + "\x00" + job.Attack.TargetLocation + "\x00" + job.Placement
}

// CapJobs keeps at most max jobs. The first pass round-robins one payload at a
// time across every route and attack, up to a per-category quota, so a long
// SQL list cannot consume the budget before XSS or open redirect run. A second
// pass fills any room that is left.
func CapJobs(jobs []types.Job, max int) []types.Job {
	if max < 1 || len(jobs) <= max {
		return jobs
	}

	type bucket struct {
		jobs  []types.Job
		next  int
		quota int
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
		groups = append(groups, bucket{jobs: []types.Job{job}, quota: jobQuota(job)})
	}

	out := make([]types.Job, 0, max)
	take := func(respectQuota bool) {
		progress := true
		for progress && len(out) < max {
			progress = false
			for i := range groups {
				g := &groups[i]
				if g.next >= len(g.jobs) {
					continue
				}
				if respectQuota && g.next >= g.quota {
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
	}
	take(true)
	take(false)
	return out
}

func jobQuota(job types.Job) int {
	category := strings.ToUpper(job.Attack.Category)
	switch {
	case strings.Contains(category, "XSS"):
		return 8
	case strings.Contains(category, "SQL"),
		strings.Contains(category, "REDIRECT"),
		strings.Contains(category, "COMMAND"),
		strings.Contains(category, "SSTI"):
		return 4
	default:
		return 2
	}
}

func jobsForVector(attackItem contracts.AttackItem, vector contracts.AttackVector, spec types.PayloadSpec) []types.Job {
	if spec.Field != "" {
		if !injectableParam(spec.Field) {
			return nil
		}
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
		if !injectableParam(paramKey) {
			continue
		}
		jobs = append(jobs, types.Job{
			Attack:   attackItem,
			Vector:   vector,
			ParamKey: paramKey,
			Payload:  spec,
		})
	}
	return jobs
}

func injectableParam(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "__viewstate", "__viewstategenerator", "__eventvalidation", "__eventtarget", "__eventargument",
		"csrf", "csrf_token", "_csrf", "authenticity_token", "__requestverificationtoken":
		return false
	default:
		return key != ""
	}
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

func ApplyAuth(jobs []types.Job, auth *contracts.TargetAuth, targetURL string) []types.Job {
	if auth == nil {
		return jobs
	}
	for i := range jobs {
		headers := contracts.HeadersForURL(auth, targetURL, jobs[i].Vector.Route)
		if len(headers) == 0 {
			continue
		}
		jobs[i].Vector.Headers = contracts.MergeHeaders(headers, jobs[i].Vector.Headers)
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

func isXSS(attackItem contracts.AttackItem) bool {
	return strings.Contains(strings.ToUpper(attackItem.Category), "XSS")
}

func isXSSQuery(attackItem contracts.AttackItem) bool {
	return isXSS(attackItem) && strings.EqualFold(attackItem.TargetLocation, "QUERY_PARAMETER")
}

func prioritizeVariants(variants []types.PayloadSpec, coverage []string) []types.PayloadSpec {
	if len(coverage) == 0 {
		return variants
	}
	field := ""
	byValue := make(map[string]types.PayloadSpec, len(variants))
	for _, variant := range variants {
		if variant.Value == "" {
			continue
		}
		if field == "" && variant.Field != "" {
			field = variant.Field
		}
		if _, exists := byValue[variant.Value]; !exists {
			byValue[variant.Value] = variant
		}
	}
	out := make([]types.PayloadSpec, 0, len(coverage)+len(variants))
	seen := make(map[string]struct{}, len(coverage)+len(variants))
	for _, value := range coverage {
		variant, ok := byValue[value]
		if !ok {
			variant = types.PayloadSpec{Value: value, Field: field}
		}
		if _, dup := seen[value]; dup {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, variant)
	}
	for _, variant := range variants {
		if variant.Value == "" {
			continue
		}
		if _, dup := seen[variant.Value]; dup {
			continue
		}
		seen[variant.Value] = struct{}{}
		out = append(out, variant)
	}
	return out
}

func browserDOMJobs(attackItem contracts.AttackItem, vector contracts.AttackVector) []types.Job {
	if !strings.EqualFold(vector.TargetLocation, "URL_PATH") || !browserDOMRoute(vector.Route) {
		return nil
	}
	next := attackItem
	next.TargetLocation = "BROWSER"
	jobs := make([]types.Job, 0, len(browserDOMPayloads))
	for _, payload := range browserDOMPayloads {
		jobs = append(jobs, types.Job{
			Attack:    next,
			Vector:    vector,
			Payload:   types.PayloadSpec{Value: payload},
			Placement: "browser",
		})
	}
	return jobs
}

func routeSinkPayloads(route string) []string {
	parsed, err := url.Parse(strings.TrimSpace(route))
	if err != nil {
		return nil
	}
	parts := strings.Split(strings.Trim(strings.ToLower(parsed.Path), "/"), "/")
	if len(parts) < 3 || parts[0] != "tags" || parts[1] != "tag" {
		return nil
	}
	tag := parts[2]
	attr := ""
	if len(parts) > 3 {
		attr = parts[3]
	}
	switch {
	case tag == "a" && attr == "href":
		return []string{`<a href="javascript:alert(1)">x</a>`}
	case tag == "script":
		return []string{`<script src="https://evil.invalid/xss.js"></script>`}
	case tag == "iframe":
		return []string{`<iframe src="javascript:alert(1)"></iframe>`}
	case tag == "img":
		return []string{`<img src=x onerror=alert(1)>`}
	case attr == "onload" || tag == "body":
		return []string{`<body onload=alert(1)></body>`}
	default:
		if tag == "" {
			return nil
		}
		return []string{"<" + tag + ` onmouseover=alert(1)>x</` + tag + ">"}
	}
}

func browserDOMRoute(route string) bool {
	parsed, err := url.Parse(strings.TrimSpace(route))
	if err != nil || parsed.Host == "" {
		return false
	}
	path := strings.ToLower(parsed.Path)
	if path == "" || path == "/" {
		return false
	}
	if strings.HasSuffix(path, "/index.html") || strings.HasSuffix(path, "/index.htm") {
		return false
	}
	switch {
	case strings.HasSuffix(path, ".jpg"),
		strings.HasSuffix(path, ".jpeg"),
		strings.HasSuffix(path, ".png"),
		strings.HasSuffix(path, ".gif"),
		strings.HasSuffix(path, ".webp"),
		strings.HasSuffix(path, ".svg"),
		strings.HasSuffix(path, ".ico"),
		strings.HasSuffix(path, ".css"),
		strings.HasSuffix(path, ".js"),
		strings.HasSuffix(path, ".map"),
		strings.HasSuffix(path, ".pdf"):
		return false
	default:
		return true
	}
}
