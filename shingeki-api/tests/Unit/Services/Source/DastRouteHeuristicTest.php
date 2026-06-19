<?php

use App\Enums\AttackScanType;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\Stack;
use App\Models\System;
use App\Models\SystemResult;
use App\Models\User;
use App\Services\Source\DastRouteHeuristic;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('dast route heuristic maps login route to login.php for php stacks', function () {
    $heuristic = new DastRouteHeuristic;
    $system = System::factory()->create();
    $stack = Stack::factory()->create(['slug' => 'vanilla_php', 'languages' => ['php']]);
    $system->stacks()->attach($stack->id, ['is_primary' => true]);

    $user = User::factory()->create();
    $attack = Attack::factory()->for($user)->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
        'scan_type' => AttackScanType::Dast,
    ]);

    $result = SystemResult::factory()->for($system)->for($attack)->create([
        'attack_dispatch_id' => $dispatch->id,
        'vulnerable_route' => '/login.php',
    ]);

    expect($heuristic->resolve($system, $result))->toBe([
        'file' => 'login.php',
        'line' => 1,
    ]);
});
