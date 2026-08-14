<?php

use App\Services\Remediation\Source\SourceFileNormalizer;

test('strips docker temp clone prefix from source paths', function () {
    expect(SourceFileNormalizer::normalize('/tmp/shingeki-sast-123/repo/public/login.php'))
        ->toBe('public/login.php');
});

test('builds source location label from structured fields', function () {
    $location = SourceFileNormalizer::locationFromResult(
        '/tmp/shingeki-sast-1/repo/public/login.php',
        40,
        41,
        null,
    );

    expect(SourceFileNormalizer::formatLabel($location))->toBe('public/login.php:40-41');
});

test('falls back to vulnerable route when structured fields are missing', function () {
    $location = SourceFileNormalizer::locationFromResult(
        null,
        null,
        null,
        '/tmp/shingeki-sast-9/repo/search.php:3',
    );

    expect(SourceFileNormalizer::formatLabel($location))->toBe('search.php:3');
});
