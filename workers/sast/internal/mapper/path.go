package mapper

import (
	"path/filepath"
	"strings"
)

func relativizePath(path, repoRoot string) string {
	path = filepath.Clean(path)
	repoRoot = filepath.Clean(repoRoot)

	if repoRoot != "" && repoRoot != "." {
		rel, err := filepath.Rel(repoRoot, path)
		if err == nil && rel != "." && !strings.HasPrefix(rel, "..") {
			return filepath.ToSlash(rel)
		}
	}

	slashPath := filepath.ToSlash(path)
	if index := strings.Index(slashPath, "/repo/"); index >= 0 {
		return strings.TrimPrefix(slashPath[index+len("/repo/"):], "/")
	}

	return strings.TrimPrefix(slashPath, "/")
}
