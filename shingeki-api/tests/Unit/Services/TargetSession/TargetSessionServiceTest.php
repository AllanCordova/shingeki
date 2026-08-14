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
