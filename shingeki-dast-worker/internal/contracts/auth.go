package contracts

type TargetAuth struct {
	Type    string            `json:"type"`
	Headers map[string]string `json:"headers"`
}

func (b DispatchBatch) AuthHeaders() map[string]string {
	if b.Auth == nil || len(b.Auth.Headers) == 0 {
		return nil
	}

	out := make(map[string]string, len(b.Auth.Headers))
	for key, value := range b.Auth.Headers {
		out[key] = value
	}

	return out
}

func MergeHeaders(global, local map[string]string) map[string]string {
	if len(global) == 0 && len(local) == 0 {
		return nil
	}

	out := make(map[string]string, len(global)+len(local))
	for key, value := range global {
		out[key] = value
	}
	for key, value := range local {
		out[key] = value
	}

	return out
}
