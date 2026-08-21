package injectors

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

type RequestSpec struct {
	Method  string
	URL     string
	Headers map[string]string
	Body    string
}

func BuildBaseline(job types.Job) (RequestSpec, error) {
	return build(job, false)
}

func BuildAttack(job types.Job) (RequestSpec, error) {
	return build(job, true)
}

func build(job types.Job, inject bool) (RequestSpec, error) {
	location := job.Attack.TargetLocation
	if location == "" {
		location = job.Vector.TargetLocation
	}

	switch location {
	case "QUERY_PARAMETER":
		return buildQuery(job, inject)
	case "URL_PATH":
		return buildPath(job, inject)
	case "HEADER":
		return buildHeader(job, inject)
	case "COOKIE":
		return buildCookie(job, inject)
	case "FORM":
		return buildForm(job, inject)
	case "JSON_BODY", "API_ENDPOINT":
		return buildJSON(job, inject)
	case "FILE_UPLOAD":
		return buildForm(job, inject)
	default:
		return buildQuery(job, inject)
	}
}

func buildQuery(job types.Job, inject bool) (RequestSpec, error) {
	parsed, err := url.Parse(job.Vector.Route)
	if err != nil {
		return RequestSpec{}, err
	}
	values := parsed.Query()
	for key, val := range job.Vector.Params {
		values.Set(key, val)
	}
	if inject {
		key := job.ParamKey
		if key == "" && job.Payload.Field != "" {
			key = job.Payload.Field
		}
		if key == "" && len(values) > 0 {
			for k := range values {
				key = k
				break
			}
		}
		if key != "" {
			values.Set(key, job.Payload.Value)
		}
	}
	parsed.RawQuery = values.Encode()
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
		URL:     parsed.String(),
		Headers: cloneHeaders(job.Vector.Headers),
	}, nil
}

func buildPath(job types.Job, inject bool) (RequestSpec, error) {
	parsed, err := url.Parse(job.Vector.Route)
	if err != nil {
		return RequestSpec{}, err
	}
	if inject {
		segment := job.Payload.Value
		if segment == "" {
			segment = job.Payload.Field
		}
		if segment != "" {
			applyPathPayload(parsed, segment)
		}
	}
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
		URL:     parsed.String(),
		Headers: cloneHeaders(job.Vector.Headers),
	}, nil
}

func applyPathPayload(u *url.URL, payload string) {
	encoded := encodeDotDotSegments(payload)
	escaped := u.EscapedPath()
	if escaped == "" {
		escaped = "/"
	}
	prefix := escaped
	if !strings.HasSuffix(escaped, "/") {
		idx := strings.LastIndex(escaped, "/")
		if idx >= 0 {
			prefix = escaped[:idx+1]
		} else {
			prefix = "/"
		}
	}
	raw := prefix + encoded
	unescaped, err := url.PathUnescape(raw)
	if err != nil {
		unescaped = strings.ReplaceAll(strings.ReplaceAll(raw, "%2e", "."), "%2E", ".")
	}
	u.Path = unescaped
	u.RawPath = raw
}

func encodeDotDotSegments(payload string) string {
	payload = strings.ReplaceAll(payload, `\`, "/")
	payload = strings.ReplaceAll(payload, "..", "%2e%2e")
	return strings.ReplaceAll(payload, "/", "%2f")
}

func buildHeader(job types.Job, inject bool) (RequestSpec, error) {
	headers := cloneHeaders(job.Vector.Headers)
	if inject {
		name := job.Payload.Field
		if name == "" {
			name = "X-Forwarded-For"
		}
		headers[name] = job.Payload.Value
	}
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
		URL:     job.Vector.Route,
		Headers: headers,
	}, nil
}

func buildCookie(job types.Job, inject bool) (RequestSpec, error) {
	headers := cloneHeaders(job.Vector.Headers)
	if inject {
		name := job.Payload.Field
		if name == "" {
			name = "session"
		}
		pair := name + "=" + job.Payload.Value
		if existing := strings.TrimSpace(headers["Cookie"]); existing != "" {
			headers["Cookie"] = existing + "; " + pair
		} else {
			headers["Cookie"] = pair
		}
	}
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
		URL:     job.Vector.Route,
		Headers: headers,
	}, nil
}

func buildForm(job types.Job, inject bool) (RequestSpec, error) {
	values := url.Values{}
	for key, val := range job.Vector.Params {
		values.Set(key, val)
	}
	if inject {
		key := job.ParamKey
		if key == "" && job.Payload.Field != "" {
			key = job.Payload.Field
		}
		if key == "" && len(values) > 0 {
			for k := range values {
				key = k
				break
			}
		}
		if key != "" {
			values.Set(key, job.Payload.Value)
		}
	}
	method := firstNonEmpty(job.Vector.Method, http.MethodPost)
	headers := cloneHeaders(job.Vector.Headers)
	if headers["Content-Type"] == "" {
		headers["Content-Type"] = "application/x-www-form-urlencoded"
	}
	return RequestSpec{
		Method:  method,
		URL:     job.Vector.Route,
		Headers: headers,
		Body:    values.Encode(),
	}, nil
}

func buildJSON(job types.Job, inject bool) (RequestSpec, error) {
	payload := map[string]any{}
	if job.Vector.Body != "" {
		_ = json.Unmarshal([]byte(job.Vector.Body), &payload)
	}
	for key, val := range job.Vector.Params {
		payload[key] = val
	}
	if inject {
		key := job.ParamKey
		if key == "" && job.Payload.Field != "" {
			key = job.Payload.Field
		}
		if key == "" {
			key = "input"
		}
		payload[key] = job.Payload.Value
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return RequestSpec{}, fmt.Errorf("marshal json body: %w", err)
	}
	method := firstNonEmpty(job.Vector.Method, http.MethodPost)
	headers := cloneHeaders(job.Vector.Headers)
	if headers["Content-Type"] == "" {
		headers["Content-Type"] = "application/json"
	}
	return RequestSpec{
		Method:  method,
		URL:     job.Vector.Route,
		Headers: headers,
		Body:    string(body),
	}, nil
}

func cloneHeaders(src map[string]string) map[string]string {
	dst := make(map[string]string, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
