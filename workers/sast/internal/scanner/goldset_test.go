package scanner_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGoldsetTestdataKeepsTrainingPatterns(t *testing.T) {
	root := filepath.Join("..", "..", "testdata", "goldset")
	cases := []struct {
		file    string
		needles []string
	}{
		{file: "secret.js", needles: []string{"sk_live_"}},
		{file: "preview.jsx", needles: []string{"dangerouslySetInnerHTML"}},
		{file: "invoices.go", needles: []string{"SELECT * FROM invoices WHERE id", "Missing tenant isolation"}},
		{file: "github-workflow.yml", needles: []string{"actions/checkout@v4"}},
	}
	for _, tc := range cases {
		raw, err := os.ReadFile(filepath.Join(root, tc.file))
		if err != nil {
			t.Fatalf("%s: %v", tc.file, err)
		}
		body := string(raw)
		for _, needle := range tc.needles {
			if !strings.Contains(body, needle) {
				t.Errorf("%s missing %q", tc.file, needle)
			}
		}
	}
}
