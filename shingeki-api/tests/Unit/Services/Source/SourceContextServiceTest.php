<?php

use App\Enums\AttackScanType;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\System;
use App\Models\SystemResult;
use App\Models\User;
use App\Services\Source\GitHubRepositoryResolver;
use App\Services\Source\SourceContextService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('github repository resolver parses standard urls', function () {
    $resolver = new GitHubRepositoryResolver;

    expect($resolver->parse('https://github.com/shingeki/vulnerable-target'))
        ->toBe(['owner' => 'shingeki', 'repo' => 'vulnerable-target']);
});

test('source context service fetches repository excerpt for sast finding', function () {
    Http::fake([
        'raw.githubusercontent.com/*' => Http::response("line1\nline2\nline3\n", 200),
    ]);

    $service = app(SourceContextService::class);
    $user = User::factory()->create();
    $system = System::factory()->create([
        'repository_url' => 'https://github.com/shingeki/vulnerable-target',
    ]);
    $attack = Attack::factory()->for($user)->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
        'scan_type' => AttackScanType::Sast,
    ]);
    $result = SystemResult::factory()->for($system)->for($attack)->create([
        'attack_dispatch_id' => $dispatch->id,
        'vulnerable_route' => 'login.php:2',
    ]);

    $context = $service->resolve($system, $result);

    expect($context->origin)->toBe('repository')
        ->and($context->file)->toBe('login.php')
        ->and($context->line)->toBe(2)
        ->and($context->excerpt)->toContain('2 |');
});
