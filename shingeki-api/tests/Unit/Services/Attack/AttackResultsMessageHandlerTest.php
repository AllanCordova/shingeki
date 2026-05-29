<?php

use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\System;
use App\Models\User;
use App\Services\Attack\AttackDispatchCompletionProcessor;
use App\Services\Attack\AttackResultsMessageHandler;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('handler routes completion messages to dispatch processor', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    $updated = app(AttackResultsMessageHandler::class)->handle([
        'event' => AttackDispatchCompletionProcessor::EVENT,
        'dispatch_id' => $dispatch->id,
        'system_id' => $system->id,
        'duration_ms' => 2500,
        'findings_count' => 4,
    ]);

    expect($updated)->toBeInstanceOf(AttackDispatch::class)
        ->and($updated->completed_at)->not->toBeNull()
        ->and($updated->duration_ms)->toBe(2500)
        ->and($updated->findings_count)->toBe(4);
});

test('handler routes finding messages to result processor', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $attack = Attack::factory()->for($user)->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    $result = app(AttackResultsMessageHandler::class)->handle([
        'dispatch_id' => $dispatch->id,
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'vulnerable_route' => 'http://target.test/login.php',
        'payload_used' => "' OR 1=1 --",
        'evidence' => 'SQL error in response',
        'http_request' => 'POST /login.php',
    ]);

    expect($result->attack_dispatch_id)->toBe($dispatch->id)
        ->and($result->attack_id)->toBe($attack->id);
});
