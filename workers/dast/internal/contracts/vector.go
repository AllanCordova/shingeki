package contracts

import (
	"net/url"
	"strings"
)

type AttackVector struct {
	Route          string
	Method         string
	TargetLocation string
	Params         map[string]string
	Headers        map[string]string
	Body           string
	// XMLRoot is the document element the page itself builds, when discovery saw it.
	XMLRoot string
}

func NewAttackVector(route, method, targetLocation string) AttackVector {
	return AttackVector{
		Route:          route,
		Method:         method,
		TargetLocation: targetLocation,
		Params:         make(map[string]string),
		Headers:        make(map[string]string),
	}
}

// MergeVector keeps one route when discovery saw it twice.
// Empty fields are filled from the other sighting; a value already found stays.
func MergeVector(base, extra AttackVector) AttackVector {
	out := base
	out.Params = cloneStringMap(base.Params)
	for key, value := range extra.Params {
		current, exists := out.Params[key]
		if !exists || (current == "" && value != "") {
			out.Params[key] = value
		}
	}
	out.Headers = cloneStringMap(base.Headers)
	for key, value := range extra.Headers {
		if _, exists := out.Headers[key]; !exists && value != "" {
			out.Headers[key] = value
		}
	}
	if strings.TrimSpace(out.Body) == "" {
		out.Body = extra.Body
	}
	if out.XMLRoot == "" {
		out.XMLRoot = extra.XMLRoot
	}
	return out
}

func cloneStringMap(values map[string]string) map[string]string {
	out := make(map[string]string, len(values))
	for key, value := range values {
		out[key] = value
	}
	return out
}

// FormTargetLocation maps an HTML form to the HTTP place its fields actually go.
// GET forms become query parameters; POST stays FORM.
func FormTargetLocation(method string) string {
	if strings.EqualFold(strings.TrimSpace(method), "GET") {
		return "QUERY_PARAMETER"
	}
	return "FORM"
}

func WithQueryParams(route string, params map[string]string) string {
	if len(params) == 0 {
		return route
	}
	parsed, err := url.Parse(route)
	if err != nil {
		return route
	}
	query := parsed.Query()
	for key, value := range params {
		query.Set(key, value)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}
