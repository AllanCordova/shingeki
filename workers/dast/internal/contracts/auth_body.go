package contracts

import (
	"strconv"
	"strings"
)

func ResolveAuthBody(body map[string]any, identity, password string) map[string]any {
	if len(body) == 0 {
		return nil
	}
	resolved := resolveAuthValue(body, authPlaceholders(identity, password))
	out, ok := resolved.(map[string]any)
	if !ok || len(out) == 0 {
		return nil
	}
	return out
}

func FlattenAuthFields(body map[string]any) map[string]string {
	if len(body) == 0 {
		return nil
	}
	out := map[string]string{}
	flattenAuthFields(body, out)
	if len(out) == 0 {
		return nil
	}
	return out
}

func authPlaceholders(identity, password string) map[string]string {
	identity = strings.TrimSpace(identity)
	user := identity
	if at := strings.Index(identity, "@"); at >= 0 {
		user = strings.TrimSpace(identity[:at])
		if user == "" {
			user = "scanner"
		}
	}
	return map[string]string{
		"{{email}}":    identity,
		"{{username}}": identity,
		"{{user}}":     user,
		"{{password}}": password,
	}
}

func resolveAuthValue(value any, placeholders map[string]string) any {
	switch typed := value.(type) {
	case string:
		out := typed
		for key, replacement := range placeholders {
			out = strings.ReplaceAll(out, key, replacement)
		}
		return out
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, child := range typed {
			out[key] = resolveAuthValue(child, placeholders)
		}
		return out
	case []any:
		out := make([]any, len(typed))
		for i, child := range typed {
			out[i] = resolveAuthValue(child, placeholders)
		}
		return out
	default:
		return value
	}
}

func flattenAuthFields(value map[string]any, out map[string]string) {
	for key, child := range value {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		switch typed := child.(type) {
		case string:
			out[key] = typed
		case bool:
			if typed {
				out[key] = "true"
			} else {
				out[key] = "false"
			}
		case float64:
			out[key] = formatAuthNumber(typed)
		case int:
			out[key] = strconv.Itoa(typed)
		case map[string]any:
			flattenAuthFields(typed, out)
		}
	}
}

func formatAuthNumber(value float64) string {
	if value == float64(int64(value)) {
		return strconv.FormatInt(int64(value), 10)
	}
	return strconv.FormatFloat(value, 'f', -1, 64)
}
