package static

import "testing"

func TestQueryVectorFromHrefKeepsLinkedParameters(t *testing.T) {
	vector, ok := queryVectorFromHref(
		"https://range.test/reflected/index.html",
		"/reflected/parameter/body?q=a",
	)
	if !ok {
		t.Fatal("expected query vector")
	}
	if vector.TargetLocation != "QUERY_PARAMETER" || vector.Params["q"] != "a" {
		t.Fatalf("unexpected vector %#v", vector)
	}
	if _, ok := queryVectorFromHref("https://range.test/", "https://github.com/google/firing-range"); ok {
		t.Fatal("off-origin link is not an attack vector")
	}
}

func TestPathVectorFromHrefKeepsDOMCase(t *testing.T) {
	vector, ok := pathVectorFromHref(
		"https://range.test/dom/index.html",
		"/dom/toxicdom/document/cookie/innerHtml",
	)
	if !ok {
		t.Fatal("expected a path vector for the DOM case")
	}
	if vector.TargetLocation != "URL_PATH" || vector.Route != "https://range.test/dom/toxicdom/document/cookie/innerHtml" {
		t.Fatalf("unexpected vector %#v", vector)
	}

	hash, ok := pathVectorFromHref(
		"https://range.test/urldom/index.html",
		"/urldom/location/hash/a.href#//example.org",
	)
	if !ok {
		t.Fatal("expected the hash sample to be stripped into a path vector")
	}
	if hash.Route != "https://range.test/urldom/location/hash/a.href" {
		t.Fatalf("fragment leaked into the route: %s", hash.Route)
	}
	if _, ok := pathVectorFromHref("https://range.test/reflected/index.html", "/reflected/parameter/body?q=a"); ok {
		t.Fatal("query links stay on the query vector path")
	}
}

func TestPageLooksLikeSPAShell(t *testing.T) {
	shell := `<html><body><app-root></app-root><script src="main.js"></script></body></html>`
	if !pageLooksLikeSPAShell(shell, 0) {
		t.Fatal("expected angular shell")
	}
	if pageLooksLikeSPAShell(shell, 8) {
		t.Fatal("a page with many links is already crawlable")
	}
	if pageLooksLikeSPAShell(`<html><a href="/catalog">shop</a></html>`, 1) {
		t.Fatal("server-rendered page is not a shell")
	}
}

func TestPageOffersXMLOnlyForXMLSignals(t *testing.T) {
	html := `<form action="/catalog/product/stock" method="POST"></form><script src="/resources/js/xmlStockCheckPayload.js"></script>`
	if !pageOffersXML(html) {
		t.Fatal("expected xml script to mark the page")
	}
	if pageOffersXML(`<form action="/login" method="POST"><input name="email"></form>`) {
		t.Fatal("plain login form is not an xml endpoint")
	}
}

func TestXMLProbeFromFormCopiesPostFields(t *testing.T) {
	form, ok := formVector("https://shop.test/catalog/product/stock", "POST", map[string]string{
		"productId": "1",
		"storeId":   "1",
	})
	if !ok {
		t.Fatal("expected form")
	}
	probe, ok := xmlProbeFromForm(form)
	if !ok {
		t.Fatal("expected xml probe")
	}
	if probe.TargetLocation != "XML_BODY" || probe.Params["productId"] != "1" {
		t.Fatalf("unexpected probe %#v", probe)
	}
	search, ok := formVector("https://shop.test/catalog", "GET", map[string]string{"searchTerm": ""})
	if !ok {
		t.Fatal("expected search form")
	}
	if _, ok := xmlProbeFromForm(search); ok {
		t.Fatal("GET search must stay a query vector")
	}
}

func TestScriptQueryVectorsFindsCategoryLinks(t *testing.T) {
	html := `<script>
		const categories = {"All":"/catalog","Gin":"/catalog?category=Gin","Juice":"/catalog?category=Juice"};
	</script>`
	vectors := scriptQueryVectors("https://ginandjuice.shop/catalog", html)
	if len(vectors) != 2 {
		t.Fatalf("expected two category vectors, got %#v", vectors)
	}
	found := false
	for _, vector := range vectors {
		if vector.Params["category"] == "Gin" {
			found = true
		}
	}
	if !found {
		t.Fatalf("missing category vector: %#v", vectors)
	}
}

func TestAttachClientQueryParamsReadsBack(t *testing.T) {
	html := `<a href="#" onclick="location = new URLSearchParams(location.search).get('back') || '/blog';">Back to Blog</a>`
	page := "https://ginandjuice.shop/blog/post?postId=1"
	vectors := attachClientQueryParams(page, html, nil)
	if len(vectors) != 1 {
		t.Fatalf("expected one vector, got %#v", vectors)
	}
	if _, ok := vectors[0].Params["back"]; !ok {
		t.Fatalf("expected back param, got %#v", vectors[0].Params)
	}
	if vectors[0].Params["postId"] != "1" {
		t.Fatalf("expected postId to stay, got %#v", vectors[0].Params)
	}
}

func TestXMLRootFromStockScript(t *testing.T) {
	source := "xml += '<stockCheck>'; xml += '</stockCheck>';"
	if got := xmlRootFromSource(source); got != "stockCheck" {
		t.Fatalf("root=%q", got)
	}
	html := `<script src="/resources/js/xmlStockCheckPayload.js"></script>`
	if got := xmlScriptURL("https://ginandjuice.shop/catalog/product?productId=1", html); got != "https://ginandjuice.shop/resources/js/xmlStockCheckPayload.js" {
		t.Fatalf("script url=%s", got)
	}
}
