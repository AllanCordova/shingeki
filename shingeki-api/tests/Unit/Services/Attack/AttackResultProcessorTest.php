<?php

use App\Enums\AttackRiskLevel;
use App\Models\Attack;
use App\Models\System;
use App\Models\SystemResult;
use App\Services\Attack\AttackResultProcessor;
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
