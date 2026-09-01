<?php

use App\Enums\TargetSession\TargetAuthType;
use App\Services\TargetSession\TargetSessionService;

test('buildHeaders normalizes bearer token', function () {
    $service = app(TargetSessionService::class);

    $headers = $service->buildHeaders(TargetAuthType::Bearer, 'abc123');

    expect($headers)->toBe(['Authorization' => 'Bearer abc123']);
});

test('buildHeaders keeps bearer prefix when provided', function () {
    $service = app(TargetSessionService::class);

    $headers = $service->buildHeaders(TargetAuthType::Bearer, 'Bearer already-prefixed');

    expect($headers)->toBe(['Authorization' => 'Bearer already-prefixed']);
});

test('sanitizeStorage keeps compact string maps and drops empty values', function () {
    $service = app(TargetSessionService::class);

    $storage = $service->sanitizeStorage(
        ['access_token' => 'header.payload.signature', 'cache' => ''],
        ['tab' => 'open'],
    );

    expect($storage)->toBe([
        'local' => ['access_token' => 'header.payload.signature'],
        'session' => ['tab' => 'open'],
    ]);
});

test('sanitizeStorage returns null when both maps are empty', function () {
    $service = app(TargetSessionService::class);

    expect($service->sanitizeStorage(null, []))->toBeNull();
});

test('assembleStorage keeps cookie attributes and drops duplicate routes', function () {
    $service = app(TargetSessionService::class);

    $storage = $service->assembleStorage(
        null,
        null,
        [
            [
                'name' => 'sid',
                'value' => '1',
                'domain' => '.App.Example',
                'httpOnly' => true,
                'partitionKey' => ['topLevelSite' => 'https://app.example'],
            ],
        ],
        [
            ['method' => 'post', 'url' => 'https://app.example/api', 'type' => 'xmlhttprequest'],
            ['method' => 'POST', 'url' => 'https://app.example/api', 'type' => 'xmlhttprequest'],
        ],
        null,
        'Mozilla/5.0',
    );

    expect($storage['cookies'][0]['domain'])->toBe('.app.example')
        ->and($storage['cookies'][0]['partitionKey']['topLevelSite'])->toBe('https://app.example')
        ->and($storage['routes'])->toHaveCount(1)
        ->and($storage['routes'][0]['method'])->toBe('POST')
        ->and($storage['user_agent'])->toBe('Mozilla/5.0');
});

test('cookieHeaderFromCookies joins name value pairs', function () {
    $service = app(TargetSessionService::class);

    expect($service->cookieHeaderFromCookies([
        ['name' => 'a', 'value' => '1'],
        ['name' => 'b', 'value' => 'two'],
    ]))->toBe('a=1; b=two');
});
