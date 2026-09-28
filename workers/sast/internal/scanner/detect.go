package scanner

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

var skipScanDirs = map[string]struct{}{
	".git":         {},
	"node_modules": {},
	"vendor":       {},
	"dist":         {},
	"build":        {},
	".next":        {},
	"coverage":     {},
	"__pycache__":  {},
	"target":       {},
}

var extensionLanguage = map[string]string{
	".php":  "php",
	".js":   "javascript",
	".jsx":  "javascript",
	".mjs":  "javascript",
	".cjs":  "javascript",
	".ts":   "typescript",
	".tsx":  "typescript",
	".py":   "python",
	".go":   "go",
	".java": "java",
	".rb":   "ruby",
	".erb":  "ruby",
}

func detectRepoLanguages(repoDir string) []string {
	seen := map[string]struct{}{}
	_ = filepath.WalkDir(repoDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if _, skip := skipScanDirs[d.Name()]; skip {
				return filepath.SkipDir
			}
			return nil
		}
		lang, ok := extensionLanguage[strings.ToLower(filepath.Ext(d.Name()))]
		if !ok {
			return nil
		}
		seen[lang] = struct{}{}
		return nil
	})
	order := []string{"php", "typescript", "javascript", "python", "go", "java", "ruby"}
	out := make([]string, 0, len(seen))
	for _, lang := range order {
		if _, ok := seen[lang]; ok {
			out = append(out, lang)
		}
	}
	return out
}

func filterLanguagesByRepo(repoDir string, requested []string) []string {
	detected := detectRepoLanguages(repoDir)
	if len(detected) == 0 {
		return requested
	}
	if len(requested) == 0 {
		return detected
	}
	allow := map[string]struct{}{}
	for _, lang := range requested {
		allow[canonicalLang(lang)] = struct{}{}
	}
	var out []string
	for _, lang := range detected {
		if _, ok := allow[canonicalLang(lang)]; ok {
			out = append(out, lang)
		}
	}
	if len(out) == 0 {
		return detected
	}
	return out
}

func canonicalLang(language string) string {
	language = strings.ToLower(strings.TrimSpace(language))
	switch language {
	case "ts":
		return "typescript"
	case "js":
		return "javascript"
	case "py":
		return "python"
	case "golang":
		return "go"
	case "rb":
		return "ruby"
	default:
		return language
	}
}

func DetectRepoLanguages(repoDir string) []string {
	if _, err := os.Stat(repoDir); err != nil {
		return nil
	}
	return detectRepoLanguages(repoDir)
}
