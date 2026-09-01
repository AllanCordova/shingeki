package mapper

import "testing"

func TestRelativizePath(t *testing.T) {
	got := relativizePath(
		"/tmp/shingeki-sast-123/repo/public/login.php",
		"/tmp/shingeki-sast-123/repo",
	)

	if got != "public/login.php" {
		t.Fatalf("unexpected path: %s", got)
	}
}

func TestRelativizePathFromRepoSegment(t *testing.T) {
	got := relativizePath("/tmp/shingeki-sast-123/repo/public/login.php", "")

	if got != "public/login.php" {
		t.Fatalf("unexpected path: %s", got)
	}
}

func TestRelativizePathDoesNotStripSiblingPrefix(t *testing.T) {
	got := relativizePath(
		"/tmp/foo-extra/secret.php",
		"/tmp/foo",
	)

	if got == "extra/secret.php" || got == "-extra/secret.php" {
		t.Fatalf("sibling prefix was stripped: %s", got)
	}
}
