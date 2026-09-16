package evidence

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/shingeki/dast-worker/internal/attack/types"
)

var emailJSONPattern = regexp.MustCompile(`"email"\s*:\s*"`)

type IDORValidator struct {
	client *http.Client
	get    func(ctx context.Context, rawURL string, headers map[string]string) (string, int, error)
}

func NewIDORValidator() *IDORValidator {
	v := &IDORValidator{
		client: &http.Client{Timeout: 8 * time.Second},
	}
	v.get = v.defaultGET
	return v
}

func (v *IDORValidator) Analyze(ctx context.Context, response types.Response) *Finding {
	if !isIDORCategory(response.Job.Attack.Category) {
		return nil
	}
	if !hasRequestAuth(response.Job.Vector.Headers) {
		return nil
	}

	if finding := v.reviewPersistence(ctx, response); finding != nil {
		return finding
	}
	if userDirectoryIDOR(response) {
		if looksLikeUserDirectory(response.AttackBody) {
			return newFinding(response, "authenticated request listed multiple user emails")
		}
		return newFinding(response, "authenticated request accessed a user record by id")
	}
	if pathObjectIDOR(response) {
		return newFinding(response, "authenticated request returned a different object for a swapped path id")
	}
	return nil
}

func (v *IDORValidator) reviewPersistence(ctx context.Context, response types.Response) *Finding {
	if !looksLikeReviewRoute(response.Job.Vector.Route) {
		return nil
	}
	if !isOwnerInjectKey(response.Job.ParamKey) {
		return nil
	}
	payload := strings.TrimSpace(response.PayloadUsed)
	if !strings.Contains(payload, "@") {
		return nil
	}
	if !successStatus(response.AttackStatus) {
		return nil
	}
	if jsonHasFieldValue(response.AttackBody, "author", payload) {
		return newFinding(response, "review API accepted a foreign author in the JSON body")
	}
	if v == nil || v.get == nil {
		return nil
	}
	body, status, err := v.get(ctx, response.Job.Vector.Route, response.Job.Vector.Headers)
	if err != nil || !successStatus(status) {
		return nil
	}
	if jsonHasFieldValue(body, "author", payload) {
		return newFinding(response, "review API persisted a foreign author after JSON body IDOR")
	}
	return nil
}

func isOwnerInjectKey(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "author", "userid", "user_id", "user":
		return true
	default:
		return false
	}
}

func jsonHasFieldValue(body, field, want string) bool {
	want = strings.TrimSpace(want)
	if want == "" || strings.TrimSpace(body) == "" {
		return false
	}
	var node any
	if err := json.Unmarshal([]byte(body), &node); err != nil {
		return false
	}
	return walkJSONField(node, field, want)
}

func walkJSONField(node any, field, want string) bool {
	switch typed := node.(type) {
	case map[string]any:
		for key, value := range typed {
			if strings.EqualFold(key, field) && stringifyID(value) == want {
				return true
			}
			if walkJSONField(value, field, want) {
				return true
			}
		}
	case []any:
		for _, item := range typed {
			if walkJSONField(item, field, want) {
				return true
			}
		}
	}
	return false
}

func (v *IDORValidator) defaultGET(ctx context.Context, rawURL string, headers map[string]string) (string, int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", 0, err
	}
	for key, value := range headers {
		if key == "" || value == "" {
			continue
		}
		req.Header.Set(key, value)
	}
	client := v.client
	if client == nil {
		client = http.DefaultClient
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", resp.StatusCode, err
	}
	return string(raw), resp.StatusCode, nil
}

func isIDORCategory(category string) bool {
	return strings.Contains(strings.ToUpper(category), "IDOR")
}

func hasRequestAuth(headers map[string]string) bool {
	for key, value := range headers {
		if strings.TrimSpace(value) == "" {
			continue
		}
		if strings.EqualFold(key, "Authorization") || strings.EqualFold(key, "Cookie") {
			return true
		}
	}
	return false
}

func looksLikeReviewRoute(route string) bool {
	return strings.Contains(strings.ToLower(route), "review")
}

func successStatus(status int) bool {
	return status >= 200 && status < 300
}

func userDirectoryIDOR(response types.Response) bool {
	if looksLikeUserDirectory(response.AttackBody) && successStatus(response.AttackStatus) {
		return true
	}
	if !looksLikeUserDirectory(response.BaselineBody) || !successStatus(response.BaselineStatus) {
		return false
	}
	if !successStatus(response.AttackStatus) {
		return false
	}
	return looksLikeJSONObjectResource(response.AttackBody) && jsonResourceID(response.AttackBody) != ""
}

func looksLikeUserDirectory(body string) bool {
	if len(emailJSONPattern.FindAllStringIndex(body, 3)) < 2 {
		return false
	}
	lower := strings.ToLower(body)
	return strings.Contains(lower, `"role"`) || strings.Contains(lower, `"username"`)
}

func pathObjectIDOR(response types.Response) bool {
	if !successStatus(response.BaselineStatus) || !successStatus(response.AttackStatus) {
		return false
	}
	if !looksLikeJSONObjectResource(response.BaselineBody) || !looksLikeJSONObjectResource(response.AttackBody) {
		return false
	}
	baseID := jsonResourceID(response.BaselineBody)
	attackID := jsonResourceID(response.AttackBody)
	if baseID == "" || attackID == "" || baseID == attackID {
		return false
	}
	return similarResourceShape(response.BaselineBody, response.AttackBody)
}

func looksLikeJSONObjectResource(body string) bool {
	trimmed := strings.TrimSpace(body)
	if trimmed == "" || !strings.HasPrefix(trimmed, "{") {
		return false
	}
	var envelope map[string]any
	if err := json.Unmarshal([]byte(trimmed), &envelope); err != nil {
		return false
	}
	data, ok := envelope["data"]
	if !ok {
		_, hasID := envelope["id"]
		return hasID
	}
	_, isObject := data.(map[string]any)
	return isObject
}

func jsonResourceID(body string) string {
	var envelope map[string]any
	if err := json.Unmarshal([]byte(body), &envelope); err != nil {
		return ""
	}
	if data, ok := envelope["data"].(map[string]any); ok {
		if id := stringifyID(data["id"]); id != "" {
			return id
		}
		if id := stringifyID(data["UserId"]); id != "" {
			return "user:" + id
		}
	}
	return stringifyID(envelope["id"])
}

func similarResourceShape(baseline, attack string) bool {
	baseKeys := objectKeys(baseline)
	attackKeys := objectKeys(attack)
	if len(baseKeys) == 0 || len(attackKeys) == 0 {
		return false
	}
	shared := 0
	for key := range baseKeys {
		if _, ok := attackKeys[key]; ok {
			shared++
		}
	}
	return shared >= 2
}

func objectKeys(body string) map[string]struct{} {
	var envelope map[string]any
	if err := json.Unmarshal([]byte(body), &envelope); err != nil {
		return nil
	}
	obj := envelope
	if data, ok := envelope["data"].(map[string]any); ok {
		obj = data
	}
	keys := make(map[string]struct{}, len(obj))
	for key := range obj {
		keys[strings.ToLower(key)] = struct{}{}
	}
	return keys
}

func stringifyID(value any) string {
	if value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case float64:
		if typed == float64(int64(typed)) {
			return fmt.Sprintf("%d", int64(typed))
		}
		return strings.TrimSpace(fmt.Sprint(typed))
	default:
		return strings.TrimSpace(fmt.Sprint(typed))
	}
}
