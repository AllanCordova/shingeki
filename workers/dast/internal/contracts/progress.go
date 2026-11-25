package contracts

import (
	"encoding/json"
	"fmt"
)

const EventDispatchProgress = "attack.dispatch.progress"

type DispatchProgressMessage struct {
	Event             string `json:"event"`
	DispatchID        string `json:"dispatch_id"`
	SystemID          string `json:"system_id"`
	VectorsDiscovered int    `json:"vectors_discovered"`
	JobsPlanned       int    `json:"jobs_planned"`
}

func (m DispatchProgressMessage) MarshalJSONBytes() ([]byte, error) {
	if err := m.Validate(); err != nil {
		return nil, err
	}
	data, err := json.Marshal(m)
	if err != nil {
		return nil, fmt.Errorf("marshal progress: %w", err)
	}
	return data, nil
}

func (m DispatchProgressMessage) Validate() error {
	if m.Event != EventDispatchProgress {
		return fmt.Errorf("unexpected event %q, want %q", m.Event, EventDispatchProgress)
	}
	if m.DispatchID == "" {
		return fmt.Errorf("dispatch_id is required")
	}
	if m.SystemID == "" {
		return fmt.Errorf("system_id is required")
	}
	if m.VectorsDiscovered < 0 {
		return fmt.Errorf("vectors_discovered must be >= 0")
	}
	if m.JobsPlanned < 0 {
		return fmt.Errorf("jobs_planned must be >= 0")
	}
	return nil
}
