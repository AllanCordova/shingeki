package discovery

import (
	"net/url"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
)

func fallbackVectors(targetURL string) []contracts.AttackVector {
	base := strings.TrimRight(strings.TrimSpace(targetURL), "/")
	if base == "" {
		return nil
	}

	vectors := []contracts.AttackVector{
		formVector(base, "/login.php", "email", "password"),
		queryVector(base, "/search.php", "q", "test"),
		pathVector(base, "/browse/"),
		formVector(base, "/profile.php", "email", "bio"),
		queryVector(base, "/notes.php", "q", "test"),
		pathVector(base, "/app/browse/welcome.txt"),
		formVector(base, "/login", "email", "password"),
		formVector(base, "/registro", "name", "email", "password"),
		pathVector(base, "/projetos"),
	}

	return dedupeVectors(vectors)
}

func formVector(base string, path string, fields ...string) contracts.AttackVector {
	vector := contracts.NewAttackVector(joinURL(base, path), "POST", "FORM")
	for _, field := range fields {
		vector.Params[field] = "test"
	}
	return vector
}

func queryVector(base, path, param, value string) contracts.AttackVector {
	parsed, err := url.Parse(joinURL(base, path))
	if err != nil {
		vector := contracts.NewAttackVector(joinURL(base, path), "GET", "QUERY_PARAMETER")
		vector.Params[param] = value
		return vector
	}

	query := parsed.Query()
	query.Set(param, value)
	parsed.RawQuery = query.Encode()

	vector := contracts.NewAttackVector(parsed.String(), "GET", "QUERY_PARAMETER")
	vector.Params[param] = value
	return vector
}

func pathVector(base, path string) contracts.AttackVector {
	return contracts.NewAttackVector(joinURL(base, path), "GET", "URL_PATH")
}

func dedupeVectors(vectors []contracts.AttackVector) []contracts.AttackVector {
	seen := make(map[string]struct{}, len(vectors))
	result := make([]contracts.AttackVector, 0, len(vectors))

	for _, vector := range vectors {
		key := vector.Method + " " + vector.Route + " " + vector.TargetLocation
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, vector)
	}

	return result
}

func joinURL(base, path string) string {
	parsed, err := url.Parse(base)
	if err != nil {
		return base + path
	}
	ref, err := url.Parse(path)
	if err != nil {
		return base + path
	}
	return parsed.ResolveReference(ref).String()
}
