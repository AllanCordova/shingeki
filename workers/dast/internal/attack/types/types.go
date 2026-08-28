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
}

type PayloadSpec struct {
	Value   string
	Field   string
	Values  []string
	RawJSON json.RawMessage
}

type Response struct {
	Job            Job
	BaselineStatus int
	BaselineBody   string
	BaselineMs     int64
	AttackStatus   int
	AttackBody     string
	AttackMs       int64
	RawRequest     string
	PayloadUsed    string
	Error          error
}
