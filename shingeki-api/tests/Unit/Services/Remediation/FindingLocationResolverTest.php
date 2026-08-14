<?php

use App\Models\Scanning\SystemResult;
use App\Services\Remediation\FindingLocationResolver;

test('resolves structured columns when present', function () {
    $result = SystemResult::factory()->make([
        'source_file' => 'app/User.php',
        'start_line' => 10,
        'end_line' => 12,
        'matched_snippet' => '$id = $_GET["id"];',
    ]);

    $location = app(FindingLocationResolver::class)->resolve($result);

    expect($location?->file)->toBe('app/User.php')
        ->and($location?->startLine)->toBe(10)
        ->and($location?->endLine)->toBe(12)
        ->and($location?->matchedSnippet)->toBe('$id = $_GET["id"];');
});

test('falls back to vulnerable_route and evidence snippet', function () {
    $result = SystemResult::factory()->make([
        'vulnerable_route' => 'search.php:2',
        'evidence' => "Possible XSS\n\necho \$query;",
    ]);

    $location = app(FindingLocationResolver::class)->resolve($result);

    expect($location?->file)->toBe('search.php')
        ->and($location?->startLine)->toBe(2)
        ->and($location?->matchedSnippet)->toBe('echo $query;');
});

test('returns null for http dast routes', function () {
    $result = SystemResult::factory()->make([
        'vulnerable_route' => 'http://example.com/login.php',
    ]);

    expect(app(FindingLocationResolver::class)->resolve($result))->toBeNull();
});
