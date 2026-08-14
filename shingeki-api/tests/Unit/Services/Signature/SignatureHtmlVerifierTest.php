<?php

use App\Services\TargetAccess\Signature\SignatureHtmlVerifier;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->verifier = app(SignatureHtmlVerifier::class);
});

test('containsToken finds meta tag with name before content', function () {
    $html = '<html><head><meta name="shingeki-signature" content="abc123"></head></html>';

    expect($this->verifier->containsToken($html, 'abc123'))->toBeTrue();
});

test('containsToken finds meta tag with content before name', function () {
    $html = '<html><head><meta content="xyz789" name="shingeki-signature"></head></html>';

    expect($this->verifier->containsToken($html, 'xyz789'))->toBeTrue();
});

test('containsToken returns false when token is missing', function () {
    $html = '<html><head><meta name="shingeki-signature" content="other"></head></html>';

    expect($this->verifier->containsToken($html, 'missing'))->toBeFalse();
});

test('containsToken returns false for empty token', function () {
    expect($this->verifier->containsToken('<html></html>', ''))->toBeFalse();
});

test('fetchHtml returns response body on success', function () {
    Http::fake([
        'https://target.test' => Http::response('<html>ok</html>', 200),
    ]);

    expect($this->verifier->fetchHtml('https://target.test'))->toBe('<html>ok</html>');
});

test('fetchHtml throws when response is not successful', function () {
    Http::fake([
        'https://target.test' => Http::response('error', 500),
    ]);

    $this->verifier->fetchHtml('https://target.test');
})->throws(RuntimeException::class);
