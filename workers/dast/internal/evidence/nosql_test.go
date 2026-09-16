package evidence_test

import (
	"context"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
)

func TestNoSQLValidatorIgnoresGenericServerError(t *testing.T) {
	validator := evidence.NewNoSQLValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "NOSQL_INJECTION"},
			Vector: contracts.AttackVector{Route: "/api/Challenges/?name=Score Board"},
		},
		PayloadUsed:    `{"$gt":""}`,
		BaselineStatus: 200,
		AttackStatus:   500,
		BaselineBody:   `{"status":"success","data":[]}`,
		AttackBody:     `Unexpected token $ in JSON at position 0 {"$gt":""}`,
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("SQLite 500 echoing a $gt payload is not NoSQL: %q", finding.Evidence)
	}
}

func TestNoSQLValidatorDetectsMongoError(t *testing.T) {
	validator := evidence.NewNoSQLValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "NOSQL_INJECTION"},
			Vector: contracts.AttackVector{Route: "/users"},
		},
		PayloadUsed:    `{"$ne":null}`,
		BaselineStatus: 200,
		AttackStatus:   500,
		BaselineBody:   `{"ok":true}`,
		AttackBody:     `MongoError: Cast to ObjectId failed`,
	}
	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected Mongo error signature")
	}
}
