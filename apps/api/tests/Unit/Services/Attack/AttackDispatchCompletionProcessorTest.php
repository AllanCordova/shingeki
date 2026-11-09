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

    expect($updated->completed_at)->toBeNull()
        ->and($updated->failed_at)->not->toBeNull()
        ->and($updated->failure_reason)->toBe('discovery: chrome missing')
        ->and($updated->scanStatus())->toBe('failed');
});

test('process marks dispatch as session expired without failing it', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    $updated = app(AttackDispatchCompletionProcessor::class)->process([
        'event' => AttackDispatchCompletionProcessor::EVENT,
        'dispatch_id' => $dispatch->id,
        'system_id' => $system->id,
        'status' => 'session_expired',
        'duration_ms' => 800,
        'findings_count' => 1,
        'probes_count' => 2,
    ]);

    expect($updated->session_expired_at)->not->toBeNull()
        ->and($updated->failed_at)->toBeNull()
        ->and($updated->completed_at)->toBeNull()
        ->and($updated->scanStatus())->toBe('session_expired');
});

test('process marks dispatch as cancelled', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    $updated = app(AttackDispatchCompletionProcessor::class)->process([
        'event' => AttackDispatchCompletionProcessor::EVENT,
        'dispatch_id' => $dispatch->id,
        'system_id' => $system->id,
        'status' => 'cancelled',
        'duration_ms' => 500,
        'findings_count' => 1,
        'probes_count' => 3,
    ]);

    expect($updated->cancelled_at)->not->toBeNull()
        ->and($updated->completed_at)->toBeNull()
        ->and($updated->failed_at)->toBeNull()
        ->and($updated->findings_count)->toBe(1)
        ->and($updated->scanStatus())->toBe('cancelled');
});

test('process keeps a user cancellation when the worker later reports completion', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $cancelledAt = now()->subMinute();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
        'cancelled_at' => $cancelledAt,
    ]);

    $updated = app(AttackDispatchCompletionProcessor::class)->process([
        'event' => AttackDispatchCompletionProcessor::EVENT,
        'dispatch_id' => $dispatch->id,
        'system_id' => $system->id,
        'status' => 'completed',
        'duration_ms' => 900,
        'findings_count' => 2,
        'probes_count' => 4,
    ]);

    expect($updated->scanStatus())->toBe('cancelled')
        ->and($updated->completed_at)->toBeNull()
        ->and($updated->findings_count)->toBe(2)
        ->and($updated->duration_ms)->toBe(900)
        ->and($updated->cancelled_at?->toDateTimeString())->toBe($cancelledAt->toDateTimeString());
});
