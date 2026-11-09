<?php

namespace Database\Seeders;

/**
 * Vulnerable surface of the four seeded scanner targets.
 *
 * A DAST dispatch with no route map uses these routes, so the scan hits the
 * endpoints each lab publishes instead of a generic /api/v1 template.
 * Supply chain is covered by SAST on the Git repository, not by one of these routes.
 */
final class ScannerTargetRoutes
{
    /**
     * @return list<array<string, mixed>>
     */
    public static function dispatchRoutes(string $name): array
    {
        $routes = [];
        foreach (self::catalog($name) as $route) {
            unset($route['covers']);
            $routes[] = $route;
        }

        return $routes;
    }

    /**
     * @return list<string>
     */
    public static function coveredCategories(string $name): array
    {
        $covered = [];
        foreach (self::catalog($name) as $route) {
            foreach ($route['covers'] as $category) {
                $covered[$category] = true;
            }
        }

        return array_keys($covered);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function catalog(string $name): array
    {
        return match ($name) {
            'OWASP Juice Shop' => self::juiceShop(),
            'Google Firing Range' => self::firingRange(),
            'Acunetix ASP.NET' => self::acunetix(),
            'Gin and Juice' => self::ginAndJuice(),
            default => [],
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function juiceShop(): array
    {
        return [
            self::route('GET', '/rest/products/search', query: ['q' => 'apple'], covers: ['SQL_INJECTION', 'XSS', 'NOSQL_INJECTION']),
            self::route('POST', '/rest/user/login', body: ['email' => 'user@example.com', 'password' => 'password'], covers: ['SQL_INJECTION']),
            self::route('GET', '/rest/products/reviews', query: ['id' => '1'], covers: ['NOSQL_INJECTION']),
            self::route('GET', '/ftp/legal.md', covers: ['PATH_TRAVERSAL']),
            self::route('GET', '/redirect', query: ['to' => 'https://example.com'], covers: ['OPEN_REDIRECT']),
            self::route('GET', '/rest/basket/1', covers: ['IDOR']),
            self::route('POST', '/api/Users', body: ['email' => 'user@example.com', 'password' => 'password', 'username' => 'user'], covers: ['SSTI']),
            self::route('POST', '/profile/image/url', body: ['imageUrl' => 'https://example.com/a.png'], covers: ['SSRF']),
            self::route('POST', '/b2b/v2/orders', body: ['cid' => '1', 'order' => '1'], content: 'xml', xmlRoot: 'order', covers: ['XXE']),
            self::route('GET', '/rest/user/whoami', covers: ['JWT_CONFUSION']),
            self::route('GET', '/', covers: ['SECRET_LEAK', 'XSS']),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function acunetix(): array
    {
        return [
            self::route('GET', '/ReadNews.aspx', query: ['id' => '1', 'NewsAd' => 'ads/def.html'], covers: ['SQL_INJECTION']),
            self::route('GET', '/Comments.aspx', query: ['id' => '1'], covers: ['XSS', 'SQL_INJECTION']),
            self::route('POST', '/login.aspx', body: ['tbUsername' => 'user', 'tbPassword' => 'password'], content: 'form', covers: ['SQL_INJECTION']),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function ginAndJuice(): array
    {
        return [
            self::route('GET', '/catalog', query: ['searchTerm' => 'gin'], covers: ['SQL_INJECTION', 'XSS']),
            self::route('POST', '/catalog/subscribe', body: ['email' => 'user@example.com'], content: 'form', covers: ['XSS']),
            self::route('GET', '/blog', covers: ['XSS', 'OPEN_REDIRECT']),
            self::route('GET', '/blog/post', query: ['postId' => '1', 'back' => '/blog'], covers: ['XSS', 'OPEN_REDIRECT']),
            self::route('POST', '/catalog/product/stock', body: ['productId' => '1', 'storeId' => '1'], content: 'xml', xmlRoot: 'stockCheck', covers: ['XXE']),
        ];
    }

    /**
     * Every case linked from the public Firing Range indexes.
     *
     * @return list<array<string, mixed>>
     */
    private static function firingRange(): array
    {
        $routes = [];
        foreach (self::firingRangeCases() as [$href, $category]) {
            $routes[] = self::fromHref($href, $category);
        }

        return $routes;
    }

    /**
     * @return list<array{0: string, 1: string}>
     */
    private static function firingRangeCases(): array
    {
        return [
            ['/reflected/parameter/body?q=a', 'XSS'],
            ['/reflected/parameter/head?q=a', 'XSS'],
            ['/reflected/parameter/title?q=a', 'XSS'],
            ['/reflected/parameter/body_comment?q=a', 'XSS'],
            ['/reflected/parameter/tagname?q=a', 'XSS'],
            ['/reflected/parameter/attribute_unquoted?q=a', 'XSS'],
            ['/reflected/parameter/attribute_singlequoted?q=a', 'XSS'],
            ['/reflected/parameter/attribute_quoted?q=a', 'XSS'],
            ['/reflected/parameter/attribute_name?q=a', 'XSS'],
            ['/reflected/parameter/body/400?q=a', 'XSS'],
            ['/reflected/parameter/body/401?q=a', 'XSS'],
            ['/reflected/parameter/body/403?q=a', 'XSS'],
            ['/reflected/parameter/body/404?q=a', 'XSS'],
            ['/reflected/parameter/body/500?q=a', 'XSS'],
            ['/reflected/parameter/iframe_attribute_value?q=a', 'XSS'],
            ['/reflected/parameter/iframe_srcdoc?q=a', 'XSS'],
            ['/reflected/parameter/textarea?q=a', 'XSS'],
            ['/reflected/parameter/textarea_attribute_value?q=a', 'XSS'],
            ['/reflected/parameter/noscript?q=a', 'XSS'],
            ['/reflected/parameter/style_attribute_value?q=a', 'XSS'],
            ['/reflected/parameter/css_style?q=a', 'XSS'],
            ['/reflected/parameter/css_style_value?q=a', 'XSS'],
            ['/reflected/parameter/css_style_font_value?q=a', 'XSS'],
            ['/reflected/escapedparameter/js_eventhandler_unquoted/UNQUOTED_ATTRIBUTE?q=a', 'XSS'],
            ['/reflected/escapedparameter/js_eventhandler_quoted/DOUBLE_QUOTED_ATTRIBUTE?q=a', 'XSS'],
            ['/reflected/escapedparameter/js_eventhandler_singlequoted/SINGLE_QUOTED_ATTRIBUTE?q=a', 'XSS'],
            ['/reflected/parameter/js_assignment?q=a', 'XSS'],
            ['/reflected/parameter/js_eval?q=a', 'XSS'],
            ['/reflected/parameter/js_quoted_string?q=a', 'XSS'],
            ['/reflected/parameter/js_singlequoted_string?q=a', 'XSS'],
            ['/reflected/parameter/js_slashquoted_string?q=a', 'XSS'],
            ['/reflected/parameter/js_comment?q=a', 'XSS'],
            ['/reflected/parameter/attribute_script?q=a', 'XSS'],
            ['/reflected/url/href?q=a', 'XSS'],
            ['/reflected/url/css_import?q=a', 'XSS'],
            ['/reflected/url/script_src?q=a', 'XSS'],
            ['/reflected/url/object_data?q=a', 'XSS'],
            ['/reflected/url/object_param?q=a', 'XSS'],
            ['/reflected/parameter/json?q=a', 'XSS'],
            ['/reflected/contentsniffing/json?q=a', 'XSS'],
            ['/reflected/contentsniffing/plaintext?q=a', 'XSS'],
            ['/reflected/jsoncallback', 'XSS'],
            ['/reflected/parameter/form', 'XSS'],
            ['/reflected/filteredcharsets/body/SpaceDoubleQuoteSlashEquals?q=a', 'XSS'],
            ['/reflected/filteredcharsets/attribute_unquoted/DoubleQuoteSinglequote?q=a', 'XSS'],
            ['/reflected/filteredstrings/body/caseSensitive/script?q=a', 'XSS'],
            ['/reflected/filteredstrings/body/caseSensitive/SCRIPT?q=a', 'XSS'],
            ['/reflected/filteredstrings/body/caseInsensitive/script?q=a', 'XSS'],
            ['/dom/toxicdom/document/cookie_set/eval', 'XSS'],
            ['/dom/toxicdom/document/cookie_set/innerHtml', 'XSS'],
            ['/dom/toxicdom/document/cookie_set/documentWrite', 'XSS'],
            ['/dom/toxicdom/document/cookie/eval', 'XSS'],
            ['/dom/toxicdom/document/referrer/eval', 'XSS'],
            ['/dom/toxicdom/document/referrer/innerHtml', 'XSS'],
            ['/dom/toxicdom/document/referrer/documentWrite', 'XSS'],
            ['/dom/toxicdom/window/name/eval', 'XSS'],
            ['/dom/toxicdom/window/name/innerHtml', 'XSS'],
            ['/dom/toxicdom/window/name/documentWrite', 'XSS'],
            ['/dom/toxicdom/localStorage/array/eval', 'XSS'],
            ['/dom/toxicdom/localStorage/function/eval', 'XSS'],
            ['/dom/toxicdom/localStorage/function/innerHtml', 'XSS'],
            ['/dom/toxicdom/localStorage/function/documentWrite', 'XSS'],
            ['/dom/toxicdom/localStorage/property/documentWrite', 'XSS'],
            ['/dom/toxicdom/external/localStorage/array/eval', 'XSS'],
            ['/dom/toxicdom/external/localStorage/function/eval', 'XSS'],
            ['/dom/toxicdom/external/localStorage/function/innerHtml', 'XSS'],
            ['/dom/toxicdom/external/localStorage/function/documentWrite', 'XSS'],
            ['/dom/toxicdom/external/localStorage/property/documentWrite', 'XSS'],
            ['/dom/toxicdom/sessionStorage/array/eval', 'XSS'],
            ['/dom/toxicdom/sessionStorage/function/eval', 'XSS'],
            ['/dom/toxicdom/sessionStorage/function/innerHtml', 'XSS'],
            ['/dom/toxicdom/sessionStorage/function/documentWrite', 'XSS'],
            ['/dom/toxicdom/sessionStorage/property/documentWrite', 'XSS'],
            ['/dom/toxicdom/external/sessionStorage/array/eval', 'XSS'],
            ['/dom/toxicdom/external/sessionStorage/function/eval', 'XSS'],
            ['/dom/toxicdom/external/sessionStorage/function/innerHtml', 'XSS'],
            ['/dom/toxicdom/external/sessionStorage/function/documentWrite', 'XSS'],
            ['/dom/toxicdom/external/sessionStorage/property/documentWrite', 'XSS'],
            ['/dom/toxicdom/postMessage/eval', 'XSS'],
            ['/dom/toxicdom/postMessage/innerHtml', 'XSS'],
            ['/dom/toxicdom/postMessage/documentWrite', 'XSS'],
            ['/dom/toxicdom/postMessage/complexMessageDocumentWriteEval', 'XSS'],
            ['/dom/toxicdom/postMessage/improperOriginValidationWithPartialStringComparison', 'XSS'],
            ['/dom/toxicdom/postMessage/improperOriginValidationWithRegExp', 'XSS'],
            ['/dom/eventtriggering/document/formSubmission/eval', 'XSS'],
            ['/dom/eventtriggering/document/formSubmission/innerHtml', 'XSS'],
            ['/dom/eventtriggering/document/formSubmission/documentWrite', 'XSS'],
            ['/dom/eventtriggering/document/inputTyping/eval', 'XSS'],
            ['/dom/eventtriggering/document/inputTyping/innerHtml', 'XSS'],
            ['/dom/eventtriggering/document/inputTyping/documentWrite', 'XSS'],
            ['/dom/javascripturi.html', 'XSS'],
            ['/dom/dompropagation/', 'XSS'],
            ['/address/location.hash/assign', 'XSS'],
            ['/address/location.hash/documentwrite', 'XSS'],
            ['/address/location.hash/documentwriteln', 'XSS'],
            ['/address/location.hash/eval', 'XSS'],
            ['/address/location.hash/innerHtml', 'XSS'],
            ['/address/location.hash/rangeCreateContextualFragment', 'XSS'],
            ['/address/location.hash/replace', 'XSS'],
            ['/address/location.hash/setTimeout', 'XSS'],
            ['/address/location.hash/function', 'XSS'],
            ['/address/location.hash/onclickSetAttribute', 'XSS'],
            ['/address/location.hash/onclickAddEventListener', 'XSS'],
            ['/address/location.hash/jshref', 'XSS'],
            ['/address/location.hash/inlineevent', 'XSS'],
            ['/address/location.hash/formaction', 'XSS'],
            ['/address/location/assign', 'XSS'],
            ['/address/location/documentwrite', 'XSS'],
            ['/address/location/documentwriteln', 'XSS'],
            ['/address/location/eval', 'XSS'],
            ['/address/location/innerHtml', 'XSS'],
            ['/address/location/rangeCreateContextualFragment', 'XSS'],
            ['/address/location/replace', 'XSS'],
            ['/address/location/setTimeout', 'XSS'],
            ['/address/documentURI/documentwrite', 'XSS'],
            ['/address/baseURI/documentwrite', 'XSS'],
            ['/address/locationhref/documentwrite', 'XSS'],
            ['/address/locationpathname/documentwrite', 'XSS'],
            ['/address/locationsearch/documentwrite', 'XSS'],
            ['/address/URL/documentwrite', 'XSS'],
            ['/address/URLUnencoded/documentwrite', 'XSS'],
            ['/angular/angular_body/1.1.5?q=test', 'XSS'],
            ['/angular/angular_body/1.2.0?q=test', 'XSS'],
            ['/angular/angular_body/1.2.18?q=test', 'XSS'],
            ['/angular/angular_body/1.2.19?q=test', 'XSS'],
            ['/angular/angular_body/1.2.24?q=test', 'XSS'],
            ['/angular/angular_body/1.6.0?q=test', 'XSS'],
            ['/angular/angular_body/1.4.0?q=test', 'XSS'],
            ['/angular/angular_body_alt_symbols/1.4.0?q=test', 'XSS'],
            ['/angular/angular_body_alt_symbols_raw/1.6.0?q=test', 'XSS'],
            ['/angular/angular_body_raw/1.4.0?q=test', 'XSS'],
            ['/angular/angular_body_raw_post/1.6.0', 'XSS'],
            ['/angular/angular_body_raw_escaped/1.4.0?q=test', 'XSS'],
            ['/angular/angular_body_raw_escaped_alt_symbols/1.4.0?q=test', 'XSS'],
            ['/angular/angular_body_attribute_ng/1.4.0?q=test', 'XSS'],
            ['/angular/angular_body_attribute_non_ng/1.4.0?q=test', 'XSS'],
            ['/angular/angular_body_attribute_non_ng_raw/1.4.0?q=test', 'XSS'],
            ['/angular/angular_form_parse/1.6.0', 'XSS'],
            ['/angular/angular_cookie_parse/1.6.0', 'XSS'],
            ['/angular/angular_storage_parse/1.6.0', 'XSS'],
            ['/angular/angular_post_message_parse/1.6.0', 'XSS'],
            ['/escape/serverside/escapeHtml/body?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/body?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/head?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/head?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/body_comment?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/body_comment?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/textarea?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/textarea?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/tagname?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/tagname?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/attribute_unquoted?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/attribute_unquoted?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/attribute_singlequoted?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/attribute_singlequoted?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/attribute_quoted?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/attribute_quoted?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/attribute_name?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/attribute_name?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/css_style?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/css_style?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/css_style_value?q=a&escape=HTML_ESCAPE', 'XSS'],
            ['/escape/serverside/encodeUrl/css_style_value?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/css_style_font_value?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/css_style_font_value?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/js_assignment?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/js_assignment?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/js_eval?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/js_eval?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/js_quoted_string?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/js_quoted_string?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/js_singlequoted_string?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/js_singlequoted_string?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/js_slashquoted_string?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/js_slashquoted_string?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/js_comment?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/js_comment?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/attribute_script?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/attribute_script?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/href?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/href?q=a', 'XSS'],
            ['/escape/serverside/escapeHtml/css_import?q=a', 'XSS'],
            ['/escape/serverside/encodeUrl/css_import?q=a', 'XSS'],
            ['/escape/js/escape?q=a', 'XSS'],
            ['/escape/js/encodeURIComponent?q=a', 'XSS'],
            ['/escape/js/html_escape?q=a', 'XSS'],
            ['/tags/tag?q=a', 'XSS'],
            ['/tags/tag/meta?q=a', 'XSS'],
            ['/tags/tag/div?q=a', 'XSS'],
            ['/tags/tag/img?q=a', 'XSS'],
            ['/tags/tag/style?q=a', 'XSS'],
            ['/tags/tag/iframe?q=a', 'XSS'],
            ['/tags/tag/div/style?q=a', 'XSS'],
            ['/tags/tag/a/href?q=a', 'XSS'],
            ['/tags/tag/a/style?q=a', 'XSS'],
            ['/tags/tag/script/src?q=a', 'XSS'],
            ['/tags/tag/body/onload?q=a', 'XSS'],
            ['/tags/expression?q=a', 'XSS'],
            ['/tags/multiline?q=a', 'XSS'],
            ['/urldom/jsonp?callback=foo', 'XSS'],
            ['/urldom/redirect?url=http://example.com', 'XSS'],
            ['/urldom/location/hash/a.href#//example.org', 'XSS'],
            ['/urldom/location/hash/document.location#//example.org', 'XSS'],
            ['/urldom/location/hash/form.action#//example.org', 'XSS'],
            ['/urldom/location/hash/iframe.src#//example.org', 'XSS'],
            ['/urldom/location/hash/input.formaction#//example.org', 'XSS'],
            ['/urldom/location/hash/window.open#//example.org', 'XSS'],
            ['/urldom/location/search/area.href?//example.org', 'XSS'],
            ['/urldom/location/search/svg.a?//example.org', 'XSS'],
            ['/urldom/location/search/button.formaction?//example.org', 'XSS'],
            ['/urldom/location/search/location.assign?//example.org', 'XSS'],
            ['/urldom/location/search/frame.src?//example.org', 'XSS'],
            ['/urldom/location/hash/base.href#//example.org', 'XSS'],
            ['/urldom/location/hash/embed.src#//example.org', 'XSS'],
            ['/urldom/location/hash/fetch#//example.org', 'XSS'],
            ['/urldom/location/hash/link.href#//example.org', 'XSS'],
            ['/urldom/location/hash/object.data#//example.org', 'XSS'],
            ['/urldom/location/hash/param.code.value#//example.org', 'XSS'],
            ['/urldom/location/hash/param.movie.value#//example.org', 'XSS'],
            ['/urldom/location/hash/param.src.value#//example.org', 'XSS'],
            ['/urldom/location/hash/param.url.value#//example.org', 'XSS'],
            ['/urldom/location/hash/script.href#//example.org', 'XSS'],
            ['/urldom/location/hash/script.src#//example.org', 'XSS'],
            ['/urldom/location/hash/xhr.open#//example.org', 'XSS'],
            ['/urldom/location/hash/script.src.partial_domain#/urldom', 'XSS'],
            ['/urldom/location/hash/script.src.partial_path#urldom/script.js', 'XSS'],
            ['/urldom/location/hash/script.src.partial_query#firing-range', 'XSS'],
            ['/remoteinclude/parameter/script?q=https://google.com', 'XSS'],
            ['/remoteinclude/script_hash.html#https://google.com', 'XSS'],
            ['/remoteinclude/parameter/object_raw?q=https://google.com', 'XSS'],
            ['/remoteinclude/parameter/object/application_x-shockwave-flash?q=https://google.com', 'XSS'],
            ['/remoteinclude/object_hash.html#https://google.com', 'XSS'],
            ['/redirect/parameter?url=/', 'OPEN_REDIRECT'],
            ['/redirect/parameter/NOSTARTSWITHJS?url=/', 'OPEN_REDIRECT'],
            ['/redirect/meta?q=/', 'OPEN_REDIRECT'],
        ];
    }

    /**
     * @param  array<string, string>  $query
     * @param  array<string, string>  $body
     * @param  list<string>  $covers
     * @return array<string, mixed>
     */
    private static function route(
        string $method,
        string $path,
        array $query = [],
        array $body = [],
        ?string $content = null,
        ?string $xmlRoot = null,
        array $covers = [],
    ): array {
        $route = [
            'method' => $method,
            'path' => $path,
            'covers' => $covers,
        ];
        if ($query !== []) {
            $route['query'] = $query;
        }
        if ($body !== []) {
            $route['body'] = $body;
        }
        if ($content !== null) {
            $route['content'] = $content;
        }
        if ($xmlRoot !== null) {
            $route['xml_root'] = $xmlRoot;
        }

        return $route;
    }

    /**
     * @return array<string, mixed>
     */
    private static function fromHref(string $href, string $category): array
    {
        $path = $href;
        $query = [];
        $separator = strpos($href, '?');
        if ($separator !== false) {
            $path = substr($href, 0, $separator);
            parse_str(substr($href, $separator + 1), $parsed);
            foreach ($parsed as $key => $value) {
                if (! is_string($key) || ! is_scalar($value)) {
                    continue;
                }
                $query[$key] = (string) $value;
            }
        }

        return self::route('GET', $path, $query, covers: [$category]);
    }
}
