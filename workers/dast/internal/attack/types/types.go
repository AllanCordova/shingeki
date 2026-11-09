package types

import (
	"encoding/json"

	"github.com/shingeki/dast-worker/internal/contracts"
)

type Job struct {
	Attack   contracts.AttackItem
	Vector   contracts.AttackVector
	ParamKey string
	Payload  PayloadSpec
	// Placement is set when the payload is applied outside the HTTP request,
	// for example a browser-only DOM source.
	Placement string
}

type PayloadSpec struct {
	Value   string
	Field   string
	Values  []string
	RawJSON json.RawMessage
}

type Response struct {
	Job               Job
	BaselineStatus    int
	BaselineBody      string
	BaselineMs        int64
	AttackStatus      int
	AttackBody        string
	AttackContentType string
	AttackMs          int64
	AttackLocation    string
	BaselineLocation  string
	RawRequest        string
	PayloadUsed       string
	TimedOut          bool
	Skipped           bool
	Error             error
}
