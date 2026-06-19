<?php

use App\Models\AttackDispatch;
use App\Models\System;
use App\Models\User;
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
        ->and($updated->duration_ms)->toBe(4321)
        ->and($updated->findings_count)->toBe(0);
});
