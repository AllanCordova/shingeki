package evidence

import (
	"context"
	"regexp"
	"strings"
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
	if !allowsTimingConfirmation(response.Job.Attack.Category) {
		return nil
	}
	matches := sleepPattern.FindStringSubmatch(response.PayloadUsed)
	if len(matches) < 2 {
		return nil
	}

	expectedSeconds, err := time.ParseDuration(matches[1] + "s")
	if err != nil {
		return nil
	}
	if expectedSeconds <= v.tolerance {
		return nil
	}

	delta := time.Duration(response.AttackMs-response.BaselineMs) * time.Millisecond
	if response.TimedOut && expectedSeconds >= v.tolerance {
		if delta >= expectedSeconds-v.tolerance {
			return newFinding(response, "time-based delay matched expected sleep payload duration")
		}
	}

	lower := expectedSeconds - v.tolerance
	if lower < 0 {
		lower = 0
	}
	upper := expectedSeconds + v.tolerance
	if delta >= lower && delta <= upper {
		return newFinding(response, "time-based delay matched expected sleep payload duration")
	}

	return nil
}

func allowsTimingConfirmation(category string) bool {
	upper := strings.ToUpper(category)
	return strings.Contains(upper, "SQL") || strings.Contains(upper, "TIME") || strings.Contains(upper, "SLEEP")
}
