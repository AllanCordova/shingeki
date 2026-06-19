package attack

import (
	"encoding/json"
	"fmt"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/internal/contracts"
)

func MapVectorsToJobs(vectors []contracts.AttackVector, attacks []contracts.AttackItem) []types.Job {
	var jobs []types.Job
	for _, vector := range vectors {
		for _, attackItem := range attacks {
			if !locationCompatible(vector.TargetLocation, attackItem.TargetLocation) {
				continue
			}
			spec, err := parsePayload(attackItem.Payload)
			if err != nil {
				continue
			}

			if len(vector.Params) == 0 {
				jobs = append(jobs, types.Job{
					Attack:   attackItem,
					Vector:   vector,
					ParamKey: "",
					Payload:  spec,
				})
				continue
			}

			for paramKey := range vector.Params {
				jobs = append(jobs, types.Job{
					Attack:   attackItem,
					Vector:   vector,
					ParamKey: paramKey,
					Payload:  spec,
				})
			}
		}
	}
	return jobs
}

func locationCompatible(vectorLocation, attackLocation string) bool {
	if vectorLocation == attackLocation {
		return true
	}
	if attackLocation == "API_ENDPOINT" && (vectorLocation == "JSON_BODY" || vectorLocation == "FORM") {
		return true
	}
	return false
}

func ApplyGlobalHeaders(jobs []types.Job, global map[string]string) []types.Job {
	if len(global) == 0 {
		return jobs
	}

	for i := range jobs {
		jobs[i].Vector.Headers = contracts.MergeHeaders(global, jobs[i].Vector.Headers)
	}

	return jobs
}

func parsePayload(raw json.RawMessage) (types.PayloadSpec, error) {
	var generic map[string]any
	if err := json.Unmarshal(raw, &generic); err != nil {
		return types.PayloadSpec{}, fmt.Errorf("decode payload: %w", err)
	}

	spec := types.PayloadSpec{RawJSON: raw}
	if value, ok := generic["value"].(string); ok {
		spec.Value = value
	}
	if field, ok := generic["field"].(string); ok {
		spec.Field = field
	}
	if spec.Value == "" {
		if encoded, err := json.Marshal(generic); err == nil {
			spec.Value = string(encoded)
		}
	}
	return spec, nil
}
