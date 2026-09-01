package discovery

import (
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func fallbackVectors(targetURL string) []contracts.AttackVector {
	base := strings.TrimSpace(targetURL)
	if base == "" {
		return nil
	}
	return []contracts.AttackVector{
		contracts.NewAttackVector(base, "GET", "URL_PATH"),
	}
}
