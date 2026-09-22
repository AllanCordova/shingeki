package contracts

import (
	"encoding/json"
	"fmt"
)

const EventAttackProbe = "attack.probe"

type ProbeMessage struct {
	Event        string `json:"event"`
	DispatchID   string `json:"dispatch_id"`
	SystemID     string `json:"system_id"`
	AttackID     string `json:"attack_id"`
	Route        string `json:"route"`
	PayloadUsed  string `json:"payload_used"`
	HTTPRequest  string `json:"http_request,omitempty"`
	Outcome      string `json:"outcome"`
	Evidence     string `json:"evidence"`
	ErrorMessage string `json:"error_message,omitempty"`
}

func (p ProbeMessage) Validate() error {
	if p.Event != EventAttackProbe {
		return fmt.Errorf("unexpected event %q, want %q", p.Event, EventAttackProbe)
	}
	for _, field := range []struct {
		name string
		val  string
	}{
		{"dispatch_id", p.DispatchID},
		{"system_id", p.SystemID},
		{"attack_id", p.AttackID},
		{"route", p.Route},
		{"payload_used", p.PayloadUsed},
		{"outcome", p.Outcome},
		{"evidence", p.Evidence},
	} {
		if field.val == "" {
			return fmt.Errorf("%s is required", field.name)
		}
	}
	switch p.Outcome {
	case "clean", "error", "vulnerable":
	default:
		return fmt.Errorf("outcome must be clean, error, or vulnerable")
	}
	if p.Outcome == "error" && p.ErrorMessage == "" {
		return fmt.Errorf("error_message is required when outcome is error")
	}
	return nil
}

func (p ProbeMessage) MarshalJSONBytes() ([]byte, error) {
	if err := p.Validate(); err != nil {
		return nil, err
	}
	data, err := json.Marshal(p)
	if err != nil {
		return nil, fmt.Errorf("marshal probe: %w", err)
	}
	return data, nil
}
