package mapper

import (
	"path/filepath"
	"strings"
)

func relativizePath(path, repoRoot string) string {
	path = filepath.ToSlash(path)
	repoRoot = filepath.ToSlash(repoRoot)

	if repoRoot != "" && strings.HasPrefix(path, repoRoot) {
		relative := strings.TrimPrefix(path, repoRoot)

		return strings.TrimPrefix(relative, "/")
	}

	if index := strings.Index(path, "/repo/"); index >= 0 {
		return strings.TrimPrefix(path[index+len("/repo/"):], "/")
	}

	return strings.TrimPrefix(path, "/")
}
