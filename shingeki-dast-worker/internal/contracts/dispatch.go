package contracts

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/shingeki/dast-worker/pkg/targeturl"
)

const (
	EventDispatchBatch = "attack.dispatch.batch"
	ScanTypeDast       = "DAST"
	ScanTypeSast       = "SAST"
)

type DispatchBatch struct {
	Event         string       `json:"event"`
	ScanType      string       `json:"scan_type"`
	DispatchID    string       `json:"dispatch_id"`
	SystemID      string       `json:"system_id"`
	UserID        string       `json:"user_id"`
	TargetURL     string       `json:"target_url"`
	RepositoryURL string       `json:"repository_url"`
	Attacks       []AttackItem `json:"attacks"`
	DispatchedAt  string       `json:"dispatched_at"`
	Auth          *TargetAuth  `json:"auth,omitempty"`
}

func (b DispatchBatch) EffectiveScanType() string {
	if b.ScanType == "" {
		return ScanTypeDast
	}
	return b.ScanType
}

type AttackItem struct {
	AttackID       string          `json:"attack_id"`
	Category       string          `json:"category"`
	TargetLocation string          `json:"target_location"`
	RiskLevel      string          `json:"risk_level"`
	Payload        json.RawMessage `json:"payload"`
}

func ParseDispatchBatch(data []byte) (DispatchBatch, error) {
	var batch DispatchBatch
	if err := json.Unmarshal(data, &batch); err != nil {
		return DispatchBatch{}, fmt.Errorf("decode dispatch batch: %w", err)
	}
	if err := batch.Validate(); err != nil {
		return DispatchBatch{}, err
	}
	return batch, nil
}

func (b DispatchBatch) Validate() error {
	if b.Event != EventDispatchBatch {
		return fmt.Errorf("unexpected event %q, want %q", b.Event, EventDispatchBatch)
	}
	if b.DispatchID == "" {
		return fmt.Errorf("dispatch_id is required")
	}
	if b.SystemID == "" {
		return fmt.Errorf("system_id is required")
	}
	if b.UserID == "" {
		return fmt.Errorf("user_id is required")
	}
	scanType := b.EffectiveScanType()
	if scanType != ScanTypeDast && scanType != ScanTypeSast {
		return fmt.Errorf("unexpected scan_type %q", scanType)
	}
	if scanType != ScanTypeDast {
		return fmt.Errorf("dast worker only accepts scan_type %q, got %q", ScanTypeDast, scanType)
	}
	if b.TargetURL == "" {
		return fmt.Errorf("target_url is required")
	}
	if err := targeturl.AssertHTTP(b.TargetURL); err != nil {
		return fmt.Errorf("target_url: %w", err)
	}
	if len(b.Attacks) == 0 {
		return fmt.Errorf("attacks must not be empty")
	}
	for i, a := range b.Attacks {
		if err := a.Validate(); err != nil {
			return fmt.Errorf("attacks[%d]: %w", i, err)
		}
	}
	return nil
}

func (a AttackItem) Validate() error {
	if a.AttackID == "" {
		return fmt.Errorf("attack_id is required")
	}
	if a.Category == "" {
		return fmt.Errorf("category is required")
	}
	if a.TargetLocation == "" {
		return fmt.Errorf("target_location is required")
	}
	if len(a.Payload) == 0 {
		return fmt.Errorf("payload is required")
	}
	return nil
}

func (b DispatchBatch) ParsedDispatchedAt() time.Time {
	if b.DispatchedAt == "" {
		return time.Time{}
	}
	t, err := time.Parse(time.RFC3339, b.DispatchedAt)
	if err != nil {
		return time.Time{}
	}
	return t
}
