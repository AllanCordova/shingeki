package xss

import (
	"context"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/evidence"
)

type RodDialogValidator struct{}

func NewRodDialogValidator() *RodDialogValidator {
	return &RodDialogValidator{}
}

func (v *RodDialogValidator) Analyze(_ context.Context, _ types.Response) *evidence.Finding {
	return nil
}
