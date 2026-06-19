package contracts

import (
	"encoding/json"
	"fmt"
)

const EventDispatchCompleted = "attack.dispatch.completed"

type DispatchCompletionMessage struct {
	Event         string `json:"event"`
	DispatchID    string `json:"dispatch_id"`
	SystemID      string `json:"system_id"`
	DurationMs    int64  `json:"duration_ms"`
	FindingsCount int    `json:"findings_count"`
}

func (m DispatchCompletionMessage) MarshalJSONBytes() ([]byte, error) {
	if err := m.Validate(); err != nil {
		return nil, err
	}
	data, err := json.Marshal(m)
	if err != nil {
		return nil, fmt.Errorf("marshal completion: %w", err)
	}
	return data, nil
}

func (m DispatchCompletionMessage) Validate() error {
	if m.Event != EventDispatchCompleted {
		return fmt.Errorf("unexpected event %q, want %q", m.Event, EventDispatchCompleted)
	}
	if m.DispatchID == "" {
		return fmt.Errorf("dispatch_id is required")
	}
	if m.SystemID == "" {
		return fmt.Errorf("system_id is required")
	}
	if m.DurationMs < 0 {
		return fmt.Errorf("duration_ms must be >= 0")
	}
	if m.FindingsCount < 0 {
		return fmt.Errorf("findings_count must be >= 0")
	}
	return nil
}
