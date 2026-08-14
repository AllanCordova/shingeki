<?php

use App\Services\Remediation\Source\GitHubRepositoryResolver;

test('github repository resolver rejects non github hosts', function () {
    $resolver = new GitHubRepositoryResolver;

    expect($resolver->parse('https://gitlab.com/shingeki/vulnerable-target'))->toBeNull()
        ->and($resolver->parse('http://github.com/shingeki/vulnerable-target'))->toBeNull();
});

test('github repository resolver allowlist blocks unauthorized repositories', function () {
    config([
        'github.require_repository_allowlist' => true,
        'github.allowed_repositories' => ['acme/allowed'],
    ]);

    $resolver = new GitHubRepositoryResolver;
    $coordinates = $resolver->parse('https://github.com/acme/other');

    expect($coordinates)->toBe(['owner' => 'acme', 'repo' => 'other']);

    $resolver->assertAllowed($coordinates);
})->throws(InvalidArgumentException::class);
