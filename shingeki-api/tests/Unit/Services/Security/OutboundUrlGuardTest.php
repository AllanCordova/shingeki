<?php

use App\Services\Security\OutboundUrlGuard;

beforeEach(function () {
    config([
        'security.ssrf.allow_private_networks' => false,
        'security.ssrf.resolve_dns' => false,
        'security.ssrf.allowed_ports' => [80, 443],
    ]);
});

test('allows public https urls without dns resolution in tests', function () {
    app(OutboundUrlGuard::class)->assertSafe('https://example.com/path');

    expect(true)->toBeTrue();
});

test('rejects metadata hosts', function () {
    app(OutboundUrlGuard::class)->assertSafe('http://169.254.169.254/latest/meta-data');
})->throws(InvalidArgumentException::class);

test('rejects loopback when private networks are disabled', function () {
    app(OutboundUrlGuard::class)->assertSafe('http://127.0.0.1/');
})->throws(InvalidArgumentException::class);

test('allows loopback when private networks are enabled', function () {
    config(['security.ssrf.allow_private_networks' => true]);

    app(OutboundUrlGuard::class)->assertSafe('http://127.0.0.1:8090/');

    expect(true)->toBeTrue();
});
