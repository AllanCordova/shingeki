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
