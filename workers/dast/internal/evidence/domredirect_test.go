package evidence

import "testing"

func TestNavigationConfirmsOffOriginOnly(t *testing.T) {
	if !navigationConfirmsRedirect("ginandjuice.shop", "https://evil.invalid/landed", "evil.invalid") {
		t.Fatal("expected off-origin navigation to confirm")
	}
	if navigationConfirmsRedirect("ginandjuice.shop", "https://ginandjuice.shop/blog", "evil.invalid") {
		t.Fatal("same host must not confirm")
	}
	if navigationConfirmsRedirect("ginandjuice.shop", "https://other.invalid/", "evil.invalid") {
		t.Fatal("a different host than the payload must not confirm")
	}
}
