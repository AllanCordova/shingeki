package evidence

import (
	"strings"
	"testing"
)

func TestPlanDOMSourceReadsThePage(t *testing.T) {
	cookie := planDOMSource(`lookupCookie('ThisCookieIsTotallyRandomAndCantPossiblyBeSet')`)
	if cookie.Kind != "cookie" || cookie.CookieName != "ThisCookieIsTotallyRandomAndCantPossiblyBeSet" {
		t.Fatalf("cookie plan %#v", cookie)
	}
	if planDOMSource(`var payload = window.name;`).Kind != "name" {
		t.Fatal("expected window.name")
	}
	storage := planDOMSource(`var payload = localStorage.badValue;`)
	if storage.Kind != "storage" || storage.StorageKey != "badValue" {
		t.Fatalf("storage plan %#v", storage)
	}
	if planDOMSource(`var payload = unescape(document.referrer);`).Kind != "referrer" {
		t.Fatal("expected referrer")
	}
	if planDOMSource(`window.addEventListener('message', postMessageHandler, false);`).Kind != "postmessage" {
		t.Fatal("expected postMessage")
	}
	if planDOMSource(`input.addEventListener('keyup', xssIt);`).Kind != "event" {
		t.Fatal("expected input event")
	}
	if planDOMSource(`var payload = window.location.hash.substr(1);`).Kind != "url" {
		t.Fatal("expected URL source")
	}
	if planDOMSource(`<html><body>plain</body></html>`).Kind != "" {
		t.Fatal("plain HTML is not a DOM source")
	}
}

func TestWithDOMPayloadPutsValueInQueryAndFragment(t *testing.T) {
	got := withDOMPayload("https://range.test/address/location.hash/innerHtml", "<img src=x onerror=alert(1)>")
	if !strings.Contains(got, "xss=") || !strings.Contains(got, "#") {
		t.Fatalf("payload missing from URL: %s", got)
	}
}
