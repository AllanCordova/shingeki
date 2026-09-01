package contracts

import (
	"bytes"
	"encoding/json"
)

// StringMap decodes a JSON object of strings. Empty JSON arrays (PHP [] for
// empty assoc maps) decode as an empty map instead of failing unmarshal.
type StringMap map[string]string

func (m *StringMap) UnmarshalJSON(data []byte) error {
	trimmed := bytes.TrimSpace(data)
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
		*m = nil
		return nil
	}
	if trimmed[0] == '[' {
		*m = StringMap{}
		return nil
	}
	var raw map[string]string
	if err := json.Unmarshal(trimmed, &raw); err != nil {
		return err
	}
	*m = StringMap(raw)
	return nil
}
