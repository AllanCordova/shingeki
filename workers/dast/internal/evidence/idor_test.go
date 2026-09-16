package evidence_test

import (
	"context"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/internal/evidence"
)

func TestIDORValidatorDetectsSwappedBasket(t *testing.T) {
	validator := evidence.NewIDORValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{AttackID: "idor-1", Category: "IDOR", TargetLocation: "URL_PATH"},
			Vector: contracts.AttackVector{
				Route:   "http://shop.test/rest/basket/1",
				Method:  "GET",
				Headers: map[string]string{"Authorization": "Bearer tok"},
			},
		},
		BaselineStatus: 200,
		AttackStatus:   200,
		BaselineBody:   `{"status":"success","data":{"id":1,"UserId":1,"coupon":null,"Products":[]}}`,
		AttackBody:     `{"status":"success","data":{"id":2,"UserId":2,"coupon":null,"Products":[{"id":4}]}}`,
		PayloadUsed:    "2",
	}
	finding := validator.Analyze(context.Background(), resp)
	if finding == nil {
		t.Fatal("expected basket IDOR finding")
	}
}

func TestIDORValidatorIgnoresSameObject(t *testing.T) {
	validator := evidence.NewIDORValidator()
	body := `{"status":"success","data":{"id":1,"UserId":1,"Products":[]}}`
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "IDOR"},
			Vector: contracts.AttackVector{
				Route:   "http://shop.test/rest/basket/1",
				Headers: map[string]string{"Authorization": "Bearer tok"},
			},
		},
		BaselineStatus: 200,
		AttackStatus:   200,
		BaselineBody:   body,
		AttackBody:     body,
		PayloadUsed:    "1",
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("same basket must not confirm: %q", finding.Evidence)
	}
}

func TestIDORValidatorIgnoresUnauthenticated(t *testing.T) {
	validator := evidence.NewIDORValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "IDOR"},
			Vector: contracts.AttackVector{Route: "http://shop.test/rest/basket/1"},
		},
		BaselineStatus: 401,
		AttackStatus:   200,
		BaselineBody:   "Unauthorized",
		AttackBody:     `{"status":"success","data":{"id":2,"UserId":2,"Products":[]}}`,
		PayloadUsed:    "2",
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("unauthenticated jobs must not confirm: %q", finding.Evidence)
	}
}

func TestIDORValidatorDetectsUserDirectory(t *testing.T) {
	validator := evidence.NewIDORValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "IDOR"},
			Vector: contracts.AttackVector{
				Route:   "http://shop.test/api/Users/",
				Headers: map[string]string{"Authorization": "Bearer tok"},
			},
		},
		BaselineStatus: 200,
		AttackStatus:   200,
		BaselineBody:   `{"status":"success","data":[{"id":1,"email":"admin@juice-sh.op","role":"admin"},{"id":2,"email":"jim@juice-sh.op","role":"customer"}]}`,
		AttackBody:     `{"status":"success","data":{"id":2,"email":"jim@juice-sh.op","role":"customer"}}`,
		PayloadUsed:    "2",
	}
	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected user directory finding")
	}
}

func TestIDORValidatorIgnoresFailedUserIDSwap(t *testing.T) {
	validator := evidence.NewIDORValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "IDOR"},
			Vector: contracts.AttackVector{
				Route:   "http://shop.test/api/Users/",
				Headers: map[string]string{"Authorization": "Bearer tok"},
			},
		},
		BaselineStatus: 200,
		AttackStatus:   404,
		BaselineBody:   `{"status":"success","data":[{"id":1,"email":"admin@juice-sh.op"},{"id":2,"email":"jim@juice-sh.op"}]}`,
		AttackBody:     `{"error":"Not Found"}`,
		PayloadUsed:    "100",
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("404 user id swap must not confirm: %q", finding.Evidence)
	}
}

func TestIDORValidatorDetectsPersistedReviewAuthor(t *testing.T) {
	validator := evidence.NewIDORValidator()
	payload := "idor-harness@shingeki.test"
	resp := types.Response{
		Job: types.Job{
			Attack:   contracts.AttackItem{Category: "IDOR", TargetLocation: "JSON_BODY"},
			ParamKey: "author",
			Vector: contracts.AttackVector{
				Route:   "http://shop.test/rest/products/1/reviews",
				Method:  "PUT",
				Headers: map[string]string{"Authorization": "Bearer tok"},
			},
		},
		BaselineStatus: 201,
		AttackStatus:   201,
		BaselineBody:   `{"status":"success"}`,
		AttackBody:     `{"status":"success","author":"` + payload + `"}`,
		PayloadUsed:    payload,
	}
	if finding := validator.Analyze(context.Background(), resp); finding == nil {
		t.Fatal("expected review IDOR when author is echoed")
	}
}

func TestIDORValidatorIgnoresReviewMessageInjection(t *testing.T) {
	validator := evidence.NewIDORValidator()
	payload := "idor-harness@shingeki.test"
	resp := types.Response{
		Job: types.Job{
			Attack:   contracts.AttackItem{Category: "IDOR", TargetLocation: "JSON_BODY"},
			ParamKey: "message",
			Vector: contracts.AttackVector{
				Route:   "http://shop.test/rest/products/1/reviews",
				Method:  "PUT",
				Headers: map[string]string{"Authorization": "Bearer tok"},
			},
		},
		BaselineStatus: 201,
		AttackStatus:   201,
		BaselineBody:   `{"status":"success"}`,
		AttackBody:     `{"status":"success"}`,
		PayloadUsed:    payload,
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("payload in message is not author IDOR: %q", finding.Evidence)
	}
}

func TestIDORValidatorIgnoresSQLCategory(t *testing.T) {
	validator := evidence.NewIDORValidator()
	resp := types.Response{
		Job: types.Job{
			Attack: contracts.AttackItem{Category: "SQL_INJECTION"},
			Vector: contracts.AttackVector{
				Route:   "http://shop.test/rest/basket/1",
				Headers: map[string]string{"Authorization": "Bearer tok"},
			},
		},
		BaselineStatus: 200,
		AttackStatus:   200,
		BaselineBody:   `{"status":"success","data":{"id":1,"UserId":1,"Products":[]}}`,
		AttackBody:     `{"status":"success","data":{"id":2,"UserId":2,"Products":[]}}`,
		PayloadUsed:    "2",
	}
	if finding := validator.Analyze(context.Background(), resp); finding != nil {
		t.Fatalf("SQL jobs must not use IDOR validator: %q", finding.Evidence)
	}
}
