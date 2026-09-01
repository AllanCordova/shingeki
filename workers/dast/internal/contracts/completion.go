package contracts

import (
	"encoding/json"
	"fmt"
)

const (
	EventDispatchCompleted    = "attack.dispatch.completed"
	CompletionStatusCompleted = "completed"
	CompletionStatusFailed    = "failed"
)

type DispatchCompletionMessage struct {
	Event             string `json:"event"`
	DispatchID        string `json:"dispatch_id"`
	SystemID          string `json:"system_id"`
	Status            string `json:"status"`
	Error             string `json:"error,omitempty"`
	DurationMs        int64  `json:"duration_ms"`
	FindingsCount     int    `json:"findings_count"`
	ProbesCount       int    `json:"probes_count"`
	VectorsDiscovered int    `json:"vectors_discovered"`
	JobsPlanned       int    `json:"jobs_planned"`
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
	switch m.Status {
	case CompletionStatusCompleted, CompletionStatusFailed:
	default:
		return fmt.Errorf("status must be %q or %q", CompletionStatusCompleted, CompletionStatusFailed)
	}
	if m.Status == CompletionStatusFailed && m.Error == "" {
		return fmt.Errorf("error is required when status is failed")
	}
	if m.DurationMs < 0 {
		return fmt.Errorf("duration_ms must be >= 0")
	}
	if m.FindingsCount < 0 {
		return fmt.Errorf("findings_count must be >= 0")
	}
	if m.ProbesCount < 0 {
		return fmt.Errorf("probes_count must be >= 0")
	}
	if m.VectorsDiscovered < 0 {
		return fmt.Errorf("vectors_discovered must be >= 0")
	}
	if m.JobsPlanned < 0 {
		return fmt.Errorf("jobs_planned must be >= 0")
	}
	return nil
}
