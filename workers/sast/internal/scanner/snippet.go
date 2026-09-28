package scanner

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

func HydrateSnippets(repoDir string, findings []Finding) {
	for i := range findings {
		if !unusableSnippet(findings[i].Snippet) {
			continue
		}
		snippet := readSourceSnippet(repoDir, findings[i].Path, findings[i].Line, findings[i].EndLine)
		if snippet != "" {
			findings[i].Snippet = snippet
		}
	}
}

func unusableSnippet(snippet string) bool {
	snippet = strings.TrimSpace(strings.ToLower(snippet))
	return snippet == "" || snippet == "requires login" || snippet == "<redacted>"
}

func readSourceSnippet(repoDir, path string, start, end int) string {
	if start <= 0 {
		return ""
	}
	if end < start {
		end = start
	}
	if end-start > 20 {
		end = start + 20
	}

	file, err := os.Open(resolveSourcePath(repoDir, path))
	if err != nil {
		return ""
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	for lineNo := 1; scanner.Scan(); lineNo++ {
		if lineNo < start {
			continue
		}
		if lineNo > end {
			break
		}
		lines = append(lines, scanner.Text())
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

func resolveSourcePath(repoDir, path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return path
	}
	if filepath.IsAbs(path) {
		return path
	}
	return filepath.Join(repoDir, path)
}
