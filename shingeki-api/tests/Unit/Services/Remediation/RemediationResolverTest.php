<?php

use App\Enums\AttackCategory;
use App\Enums\AttackScanType;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\Remediation;
use App\Models\Stack;
use App\Models\System;
use App\Models\SystemResult;
use App\Models\User;
use App\Services\Remediation\RemediationResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('resolves remediation by attack category and stack for dast findings', function () {
    $stack = Stack::factory()->laravel()->create();
    Remediation::factory()->for($stack)->create([
        'attack_category' => AttackCategory::SqlInjection,
        'title' => 'Laravel SQLi fix',
    ]);

    $user = User::factory()->create();
    $system = System::factory()->create();
    $system->stacks()->attach($stack->id, ['is_primary' => true]);
    $attack = Attack::factory()->for($user)->create([
        'category' => AttackCategory::SqlInjection,
    ]);
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
        'scan_type' => AttackScanType::Dast,
        'completed_at' => now(),
    ]);
    $result = SystemResult::factory()
        ->for($system)
        ->for($attack)
        ->create(['attack_dispatch_id' => $dispatch->id]);

    $resolved = (new RemediationResolver)->resolveForResult(
        $result->load(['attack', 'attackDispatch']),
        $system->stacks,
    );

    expect($resolved)->toHaveCount(1)
        ->and($resolved[0]['stack']['slug'])->toBe('laravel')
        ->and($resolved[0]['title'])->toBe('Laravel SQLi fix');
});

test('resolves remediation by semgrep rule id for sast findings', function () {
    $stack = Stack::factory()->laravel()->create();
    Remediation::factory()->for($stack)->create([
        'scan_type' => AttackScanType::Sast,
        'semgrep_rule_id' => 'php.lang.security.injection.sql-injection',
        'attack_category' => null,
        'title' => 'Semgrep SQLi fix',
    ]);

    $user = User::factory()->create();
    $system = System::factory()->create();
    $system->stacks()->attach($stack->id, ['is_primary' => true]);
    $attack = Attack::factory()->sast()->for($user)->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
        'scan_type' => AttackScanType::Sast,
        'completed_at' => now(),
    ]);
    $result = SystemResult::factory()
        ->for($system)
        ->for($attack)
        ->create([
            'attack_dispatch_id' => $dispatch->id,
            'payload_used' => 'php.lang.security.injection.sql-injection',
            'vulnerable_route' => 'app/Models/User.php:10',
        ]);

    $resolved = (new RemediationResolver)->resolveForResult(
        $result->load(['attack', 'attackDispatch']),
        $system->stacks,
    );

    expect($resolved)->toHaveCount(1)
        ->and($resolved[0]['title'])->toBe('Semgrep SQLi fix');
});
