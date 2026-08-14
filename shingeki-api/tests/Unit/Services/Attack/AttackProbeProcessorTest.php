<?php

use App\Models\Catalog\Attack;
use App\Models\Identity\User;
use App\Models\Scanning\AttackDispatch;
use App\Models\Workspace\System;
use App\Services\Scanning\Attack\AttackProbeProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('probe processor stores clean probe payload', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $attack = Attack::factory()->for($user)->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    $probe = app(AttackProbeProcessor::class)->process([
        'event' => AttackProbeProcessor::EVENT,
        'dispatch_id' => $dispatch->id,
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'route' => 'http://target.test/login.php',
        'payload_used' => "' OR 1=1 --",
        'http_request' => 'POST /login.php',
        'outcome' => 'clean',
        'evidence' => 'HTTP 200 · nenhum indicador detectado',
    ]);

    expect($probe->attack_dispatch_id)->toBe($dispatch->id)
        ->and($probe->outcome->value)->toBe('clean')
        ->and($probe->route)->toBe('http://target.test/login.php');
});

test('probe processor requires error message for error outcome', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $attack = Attack::factory()->for($user)->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    app(AttackProbeProcessor::class)->process([
        'event' => AttackProbeProcessor::EVENT,
        'dispatch_id' => $dispatch->id,
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'route' => 'http://target.test/login.php',
        'payload_used' => "' OR 1=1 --",
        'outcome' => 'error',
        'evidence' => 'Falha ao executar teste',
    ]);
})->throws(InvalidArgumentException::class);
