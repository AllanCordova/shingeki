package attack_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/internal/attack"
	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func TestMapVectorsToJobs(t *testing.T) {
	vectors := []contracts.AttackVector{
		{
			Route:          "https://example.com/login",
			Method:         "POST",
			TargetLocation: "FORM",
			Params:         map[string]string{"email": "", "password": ""},
		},
	}
	attacks := []contracts.AttackItem{
		{
			AttackID:       "atk-1",
			Category:       "SQL_INJECTION",
			TargetLocation: "FORM",
			Payload:        json.RawMessage(`{"field":"email","value":"' OR 1=1 --"}`),
		},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) != 1 {
		t.Fatalf("expected 1 job on payload field, got %d", len(jobs))
	}
	if jobs[0].ParamKey != "email" {
		t.Fatalf("expected email param, got %s", jobs[0].ParamKey)
	}
}

func TestMapVectorsToJobsSkipsFrameworkFields(t *testing.T) {
	vectors := []contracts.AttackVector{
		{
			Route:          "http://asp.test/login.aspx",
			Method:         "POST",
			TargetLocation: "FORM",
			Params: map[string]string{
				"__VIEWSTATE": "opaque",
				"tbUsername":  "",
				"tbPassword":  "",
				"csrf":        "token",
			},
		},
	}
	attacks := []contracts.AttackItem{
		{
			AttackID:       "atk-sql",
			Category:       "SQL_INJECTION",
			TargetLocation: "FORM",
			Payload:        json.RawMessage(`{"value":"' OR 1=1 --"}`),
		},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) != 2 {
		t.Fatalf("expected username and password only, got %d", len(jobs))
	}
	for _, job := range jobs {
		if job.ParamKey == "__VIEWSTATE" || job.ParamKey == "csrf" {
			t.Fatalf("framework field was injected: %s", job.ParamKey)
		}
	}
}

func TestMapVectorsToJobsUsesParameterAlias(t *testing.T) {
	vectors := []contracts.AttackVector{
		{
			Route:          "https://example.com/search.php?q=",
			Method:         "GET",
			TargetLocation: "QUERY_PARAMETER",
			Params:         map[string]string{"q": "", "extra": "1"},
		},
	}
	attacks := []contracts.AttackItem{
		{
			AttackID:       "atk-xss",
			Category:       "XSS",
			TargetLocation: "QUERY_PARAMETER",
			Payload:        json.RawMessage(`{"parameter":"q","value":"<script>alert(1)</script>"}`),
		},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) < 2 {
		t.Fatalf("expected the alias plus coverage payloads, got %d", len(jobs))
	}
	for _, job := range jobs {
		if job.ParamKey != "q" || job.Payload.Field != "q" {
			t.Fatalf("parameter alias leaked onto %s field %s", job.ParamKey, job.Payload.Field)
		}
	}
}

func TestMapVectorsToJobsExpandsPayloadValues(t *testing.T) {
	vectors := []contracts.AttackVector{
		{
			Route:          "http://127.0.0.1:8090/browse/welcome.txt",
			Method:         "GET",
			TargetLocation: "URL_PATH",
		},
	}
	attacks := []contracts.AttackItem{
		{
			AttackID:       "atk-path",
			Category:       "PATH_TRAVERSAL",
			TargetLocation: "URL_PATH",
			Payload:        json.RawMessage(`{"value":"../storage/secret.txt","values":["secret.txt"]}`),
		},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) != 2 {
		t.Fatalf("expected 2 payload variants, got %d", len(jobs))
	}
	got := map[string]bool{}
	for _, job := range jobs {
		got[job.Payload.Value] = true
	}
	if !got["secret.txt"] || !got["../storage/secret.txt"] {
		t.Fatalf("expected both path payloads, got %v", got)
	}
}

func TestMapVectorsToJobsJSONBodyMatchesAPIEndpoint(t *testing.T) {
	vectors := []contracts.AttackVector{
		{
			Route:          "https://shop.example/rest/user/login",
			Method:         "POST",
			TargetLocation: "API_ENDPOINT",
			Params:         map[string]string{"email": "", "password": ""},
		},
	}
	attacks := []contracts.AttackItem{
		{
			AttackID:       "atk-sql-json",
			Category:       "SQL_INJECTION",
			TargetLocation: "JSON_BODY",
			Payload:        json.RawMessage(`{"value":"' OR 1=1 --","values":["' OR 1=1 --"]}`),
		},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) != 2 {
		t.Fatalf("expected 2 jobs (email+password), got %d", len(jobs))
	}
}

func TestMapVectorsToJobsWithoutFieldExpandsParams(t *testing.T) {
	vectors := []contracts.AttackVector{
		{
			Route:          "https://example.com/login",
			Method:         "POST",
			TargetLocation: "FORM",
			Params:         map[string]string{"email": "", "password": ""},
		},
	}
	attacks := []contracts.AttackItem{
		{
			AttackID:       "atk-sql",
			Category:       "SQL_INJECTION",
			TargetLocation: "FORM",
			Payload:        json.RawMessage(`{"value":"' OR 1=1 --"}`),
		},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) != 2 {
		t.Fatalf("expected jobs for every form field, got %d", len(jobs))
	}
}

func TestCapJobsRoundRobinKeepsLateVectors(t *testing.T) {
	var jobs []types.Job
	for i, route := range []string{"http://shop.test/", "http://shop.test/rest/products/search", "http://shop.test/ftp/"} {
		for n := 0; n < 5; n++ {
			jobs = append(jobs, types.Job{
				Attack: contracts.AttackItem{AttackID: "atk", Category: "PATH_TRAVERSAL"},
				Vector: contracts.AttackVector{
					Route:          route,
					Method:         "GET",
					TargetLocation: "URL_PATH",
				},
				Payload: types.PayloadSpec{Value: route + "#" + string(rune('a'+n+i))},
			})
		}
	}
	got := attack.CapJobs(jobs, 6)
	if len(got) != 6 {
		t.Fatalf("expected 6 jobs, got %d", len(got))
	}
	ftp := 0
	for _, job := range got {
		if job.Vector.Route == "http://shop.test/ftp/" {
			ftp++
		}
	}
	if ftp != 2 {
		t.Fatalf("expected 2 /ftp/ jobs after cap, got %d", ftp)
	}
}

func TestMapVectorsToJobsSkipsSecretLeak(t *testing.T) {
	vectors := []contracts.AttackVector{
		{
			Route:          "https://example.com/api/config",
			Method:         "GET",
			TargetLocation: "API_ENDPOINT",
		},
	}
	attacks := []contracts.AttackItem{
		{
			AttackID:       "atk-secret",
			Category:       "SECRET_LEAK",
			TargetLocation: "API_ENDPOINT",
			Payload:        json.RawMessage(`{"value":"passive"}`),
		},
	}

	jobs := attack.MapVectorsToJobs(vectors, attacks)
	if len(jobs) != 0 {
		t.Fatalf("SECRET_LEAK is passive and must not create inject jobs, got %d", len(jobs))
	}
}

func TestCapJobsRoundRobinKeepsLaterCategory(t *testing.T) {
	route := "https://range.test/search?q="
	var jobs []types.Job
	for i := 0; i < 20; i++ {
		jobs = append(jobs, types.Job{
			Attack:  contracts.AttackItem{AttackID: "sql", Category: "SQL_INJECTION"},
			Vector:  contracts.AttackVector{Route: route, Method: "GET", TargetLocation: "QUERY_PARAMETER"},
			Payload: types.PayloadSpec{Value: "sql"},
		})
	}
	jobs = append(jobs, types.Job{
		Attack:  contracts.AttackItem{AttackID: "redir", Category: "OPEN_REDIRECT"},
		Vector:  contracts.AttackVector{Route: route, Method: "GET", TargetLocation: "QUERY_PARAMETER"},
		Payload: types.PayloadSpec{Value: "https://evil.invalid"},
	})
	got := attack.CapJobs(jobs, 3)
	for _, job := range got {
		if job.Attack.Category == "OPEN_REDIRECT" {
			return
		}
	}
	t.Fatal("open redirect was dropped while SQL still had payloads left")
}

func TestMapVectorsAddsBrowserJobsAndCoveragePayloads(t *testing.T) {
	vectors := []contracts.AttackVector{{
		Route:          "https://range.test/address/location.hash/innerHtml",
		Method:         "GET",
		TargetLocation: "URL_PATH",
	}, {
		Route:          "https://range.test/dom/index.html",
		Method:         "GET",
		TargetLocation: "URL_PATH",
	}}
	attacks := []contracts.AttackItem{{
		AttackID:       "xss",
		Category:       "XSS",
		TargetLocation: "QUERY_PARAMETER",
		Payload:        json.RawMessage(`{"value":"<script>alert(1)</script>","values":["<script>alert(1)</script>"]}`),
	}}
	jobs := attack.MapVectorsToJobs(vectors, attacks)
	browser := 0
	for _, job := range jobs {
		if job.Attack.TargetLocation != "BROWSER" {
			t.Fatalf("address page has no query, got %s", job.Attack.TargetLocation)
		}
		if strings.Contains(job.Vector.Route, "index.html") {
			t.Fatalf("index pages are not DOM cases: %s", job.Vector.Route)
		}
		browser++
	}
	if browser != 3 {
		t.Fatalf("expected 3 browser payloads, got %d", browser)
	}

	queryJobs := attack.MapVectorsToJobs([]contracts.AttackVector{{
		Route:          "https://range.test/reflected/parameter/body?q=a",
		Method:         "GET",
		TargetLocation: "QUERY_PARAMETER",
		Params:         map[string]string{"q": "a"},
	}}, attacks)
	if len(queryJobs) < 8 {
		t.Fatalf("expected coverage payloads ahead of the catalog, got %d", len(queryJobs))
	}
	if queryJobs[0].Payload.Value != `--></script></title></textarea></style><script>alert(1)</script>` {
		t.Fatalf("coverage payload was not first: %s", queryJobs[0].Payload.Value)
	}
}

func TestCapJobsNoopWhenUnderMax(t *testing.T) {
	jobs := []types.Job{{
		Vector: contracts.AttackVector{Route: "http://shop.test/ftp/", Method: "GET", TargetLocation: "URL_PATH"},
	}}
	got := attack.CapJobs(jobs, 10)
	if len(got) != 1 {
		t.Fatalf("expected original slice, got %d", len(got))
	}
}
