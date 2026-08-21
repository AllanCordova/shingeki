package evidence

import (
	"context"
	"regexp"
	"time"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
)

var sleepPattern = regexp.MustCompile(`(?i)sleep\s*\(\s*(\d+)\s*\)`)

type TimingValidator struct {
	tolerance time.Duration
}

func NewTimingValidator(cfg config.EvidenceConfig) *TimingValidator {
	return &TimingValidator{tolerance: cfg.TimingTolerance}
}

func (v *TimingValidator) Analyze(_ context.Context, response types.Response) *Finding {
	matches := sleepPattern.FindStringSubmatch(response.PayloadUsed)
	if len(matches) < 2 {
		return nil
	}

	expectedSeconds, err := time.ParseDuration(matches[1] + "s")
	if err != nil {
		return nil
	}

	delta := time.Duration(response.AttackMs-response.BaselineMs) * time.Millisecond
	lower := expectedSeconds - v.tolerance
	upper := expectedSeconds + v.tolerance
	if delta >= lower && delta <= upper {
		return newFinding(response, "time-based delay matched expected sleep payload duration")
	}

	return nil
}
