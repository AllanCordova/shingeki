<?php

use App\Models\Attack\AttackDispatch;
use App\Models\System\System;
use App\Models\User\User;
use App\Services\Attack\AttackDispatchCompletionProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('process marks dispatch as completed', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    $updated = app(AttackDispatchCompletionProcessor::class)->process([
        'event' => AttackDispatchCompletionProcessor::EVENT,
        'dispatch_id' => $dispatch->id,
        'system_id' => $system->id,
        'duration_ms' => 4321,
        'findings_count' => 0,
    ]);

    expect($updated->completed_at)->not->toBeNull()
        ->and($updated->failed_at)->toBeNull()
        ->and($updated->duration_ms)->toBe(4321)
        ->and($updated->findings_count)->toBe(0)
        ->and($updated->scanStatus())->toBe('completed');
});

test('process marks dispatch as failed when status is failed', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    $updated = app(AttackDispatchCompletionProcessor::class)->process([
        'event' => AttackDispatchCompletionProcessor::EVENT,
        'dispatch_id' => $dispatch->id,
        'system_id' => $system->id,
        'status' => 'failed',
        'error' => 'discovery: chrome missing',
        'duration_ms' => 1200,
        'findings_count' => 0,
    ]);

    expect($updated->completed_at)->not->toBeNull()
        ->and($updated->failed_at)->not->toBeNull()
        ->and($updated->failure_reason)->toBe('discovery: chrome missing')
        ->and($updated->scanStatus())->toBe('failed');
});
