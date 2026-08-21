package contracts

import (
	"encoding/json"
	"fmt"
)

type ResultMessage struct {
	DispatchID      string `json:"dispatch_id"`
	AttackID        string `json:"attack_id"`
	SystemID        string `json:"system_id"`
	VulnerableRoute string `json:"vulnerable_route"`
	PayloadUsed     string `json:"payload_used"`
	Evidence        string `json:"evidence"`
	HTTPRequest     string `json:"http_request"`
	SourceFile      string `json:"source_file,omitempty"`
	StartLine       int    `json:"start_line,omitempty"`
	EndLine         int    `json:"end_line,omitempty"`
	MatchedSnippet  string `json:"matched_snippet,omitempty"`
}

func (r ResultMessage) Validate() error {
	if r.DispatchID == "" {
		return fmt.Errorf("dispatch_id is required")
	}
	if r.AttackID == "" {
		return fmt.Errorf("attack_id is required")
	}
	if r.SystemID == "" {
		return fmt.Errorf("system_id is required")
	}
	for _, field := range []struct {
		name string
		val  string
	}{
		{"vulnerable_route", r.VulnerableRoute},
		{"payload_used", r.PayloadUsed},
		{"evidence", r.Evidence},
		{"http_request", r.HTTPRequest},
	} {
		if field.val == "" {
			return fmt.Errorf("%s is required", field.name)
		}
	}
	return nil
}

func (r ResultMessage) MarshalJSONBytes() ([]byte, error) {
	if err := r.Validate(); err != nil {
		return nil, err
	}
	data, err := json.Marshal(r)
	if err != nil {
		return nil, fmt.Errorf("marshal result: %w", err)
	}
	return data, nil
}
