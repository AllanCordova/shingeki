package evidence

import (
	"context"
	"io"
	"log/slog"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/config"
	"github.com/shingeki/dast-worker/internal/contracts"
)

type Finding struct {
	AttackID        string
	VulnerableRoute string
	PayloadUsed     string
	Evidence        string
	HTTPRequest     string
}

func (f Finding) ToResultMessage(dispatchID, systemID string) contracts.ResultMessage {
	return contracts.ResultMessage{
		DispatchID:      dispatchID,
		AttackID:        f.AttackID,
		SystemID:        systemID,
		VulnerableRoute: f.VulnerableRoute,
		PayloadUsed:     f.PayloadUsed,
		Evidence:        f.Evidence,
		HTTPRequest:     f.HTTPRequest,
	}
}

type Validator interface {
	Analyze(ctx context.Context, response types.Response) *Finding
}

type CompositeValidator struct {
	validators []Validator
}

func NewCompositeValidator(validators ...Validator) *CompositeValidator {
	return &CompositeValidator{validators: validators}
}

func NewDefaultValidator(cfg config.Config, logger *slog.Logger) *CompositeValidator {
	return NewCompositeValidator(
		NewPathTraversalValidator(),
		NewRegexValidator(),
		NewSQLAuthBypassValidator(),
		NewSQLBooleanValidator(),
		NewIDORValidator(),
		NewRedirectValidator(),
		NewJWTValidator(),
		NewSSTIValidator(),
		NewCommandValidator(),
		NewNoSQLValidator(),
		NewXXEValidator(),
		NewLDAPValidator(),
		NewDiffValidator(cfg.Evidence),
		NewTimingValidator(cfg.Evidence),
		NewDOMXSSValidator(cfg.Discovery, logger),
	)
}

func (c *CompositeValidator) Analyze(ctx context.Context, response types.Response) *Finding {
	if response.Error != nil && !response.TimedOut {
		return nil
	}
	for _, validator := range c.validators {
		if finding := validator.Analyze(ctx, response); finding != nil {
			return finding
		}
	}
	return nil
}

func (c *CompositeValidator) Close() error {
	var first error
	for _, validator := range c.validators {
		closer, ok := validator.(io.Closer)
		if !ok {
			continue
		}
		if err := closer.Close(); err != nil && first == nil {
			first = err
		}
	}
	return first
}
