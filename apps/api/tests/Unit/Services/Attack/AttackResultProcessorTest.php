<?php

use App\Enums\Attack\AttackRiskLevel;
use App\Models\Attack\Attack;
use App\Models\Attack\AttackDispatch;
use App\Models\System\System;
use App\Models\System\SystemResult;
use App\Models\User\User;
use App\Services\Attack\AttackResultProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('process creates system result linked to attack risk level source', function () {
    $system = System::factory()->create();
    $attack = Attack::factory()->create([
        'risk_level' => AttackRiskLevel::High,
    ]);

    $result = app(AttackResultProcessor::class)->process([
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'vulnerable_route' => '/login',
        'payload_used' => "' OR 1=1 --",
        'evidence' => 'SQL error visible in response.',
        'http_request' => 'POST /login HTTP/1.1',
    ]);

    expect($result)->toBeInstanceOf(SystemResult::class)
        ->and($result->attack_id)->toBe($attack->id)
        ->and($result->attack->risk_level)->toBe(AttackRiskLevel::High);

    $this->assertDatabaseHas('system_results', [
        'id' => $result->id,
        'attack_id' => $attack->id,
        'system_id' => $system->id,
    ]);
});

test('process stores dispatch id when provided', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $attack = Attack::factory()->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    $result = app(AttackResultProcessor::class)->process([
        'dispatch_id' => $dispatch->id,
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'vulnerable_route' => '/login',
        'payload_used' => "' OR 1=1 --",
        'evidence' => 'SQL error visible in response.',
        'http_request' => 'POST /login HTTP/1.1',
    ]);

    expect($result->attack_dispatch_id)->toBe($dispatch->id);
});

test('process rewrites worker localhost host back to the cadastrado target url', function () {
    config([
        'attacks.target_localhost_rewrite' => 'host.docker.internal',
    ]);

    $system = System::factory()->create([
        'target_url' => 'http://127.0.0.1:3010',
    ]);
    $attack = Attack::factory()->create();

    $result = app(AttackResultProcessor::class)->process([
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'vulnerable_route' => 'http://host.docker.internal:3010/preview',
        'payload_used' => '<script>alert(1)</script>',
        'evidence' => 'Reflected XSS at http://host.docker.internal:3010/preview?q=1',
        'http_request' => "GET http://host.docker.internal:3010/preview?q=1 HTTP/1.1\nHost: host.docker.internal:3010",
    ]);

    expect($result->vulnerable_route)->toBe('http://127.0.0.1:3010/preview')
        ->and($result->evidence)->toContain('http://127.0.0.1:3010/preview')
        ->and($result->evidence)->not->toContain('host.docker.internal')
        ->and($result->http_request)->toContain('http://127.0.0.1:3010/preview')
        ->and($result->http_request)->toContain('Host: 127.0.0.1:3010')
        ->and($result->http_request)->not->toContain('host.docker.internal');
});

test('process stores one finding per attack and sink even with extra payloads', function () {
    $user = User::factory()->create();
    $system = System::factory()->create([
        'target_url' => 'http://127.0.0.1:3010',
    ]);
    $attack = Attack::factory()->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();
    $processor = app(AttackResultProcessor::class);

    $first = $processor->process([
        'dispatch_id' => $dispatch->id,
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'vulnerable_route' => 'http://127.0.0.1:3010/preview?q=',
        'payload_used' => '<script>alert(1)</script>',
        'evidence' => 'unescaped payload reflected in response body',
        'http_request' => 'GET /preview?q=',
    ]);
    $second = $processor->process([
        'dispatch_id' => $dispatch->id,
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'vulnerable_route' => 'http://127.0.0.1:3010/preview?q=hoje',
        'payload_used' => '<img src=x onerror=alert(1)>',
        'evidence' => 'unescaped payload reflected in response body',
        'http_request' => 'GET /preview?q=hoje',
    ]);

    expect($second->id)->toBe($first->id)
        ->and($first->vulnerable_route)->toBe('http://127.0.0.1:3010/preview?q=')
        ->and(SystemResult::query()->where('attack_dispatch_id', $dispatch->id)->count())->toBe(1);
});
