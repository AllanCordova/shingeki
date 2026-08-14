<?php

use App\Enums\Catalog\AttackRiskLevel;
use App\Models\Catalog\Attack;
use App\Models\Identity\User;
use App\Models\Scanning\AttackDispatch;
use App\Models\Scanning\SystemResult;
use App\Models\Workspace\System;
use App\Services\Scanning\Attack\AttackResultProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('process creates system result linked to attack risk level source', function () {
    $system = System::factory()->create();
    $attack = Attack::factory()->create([
        'risk_level' => AttackRiskLevel::High,
    ]);

    $result = (new AttackResultProcessor)->process([
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

    $result = (new AttackResultProcessor)->process([
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

test('process is idempotent for the same finding payload', function () {
    $system = System::factory()->create();
    $attack = Attack::factory()->create();
    $message = [
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'vulnerable_route' => '/login',
        'payload_used' => "' OR 1=1 --",
        'evidence' => 'SQL error visible in response.',
        'http_request' => 'POST /login HTTP/1.1',
    ];

    $first = (new AttackResultProcessor)->process($message);
    $second = (new AttackResultProcessor)->process($message);

    expect($second->id)->toBe($first->id)
        ->and(SystemResult::query()->count())->toBe(1);
});
