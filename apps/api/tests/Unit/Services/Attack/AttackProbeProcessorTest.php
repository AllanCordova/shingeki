<?php

use App\Models\Attack\Attack;
use App\Models\Attack\AttackDispatch;
use App\Models\System\System;
use App\Models\User\User;
use App\Services\Attack\AttackProbeProcessor;
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

test('probe processor rewrites worker localhost host back to the cadastrado target url', function () {
    config([
        'attacks.target_localhost_rewrite' => 'host.docker.internal',
    ]);

    $user = User::factory()->create();
    $system = System::factory()->create([
        'target_url' => 'http://127.0.0.1:3010',
    ]);
    $attack = Attack::factory()->for($user)->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    $probe = app(AttackProbeProcessor::class)->process([
        'event' => AttackProbeProcessor::EVENT,
        'dispatch_id' => $dispatch->id,
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'route' => 'http://host.docker.internal:3010/api/config',
        'payload_used' => '../etc/passwd',
        'http_request' => 'GET http://host.docker.internal:3010/api/config HTTP/1.1',
        'outcome' => 'clean',
        'evidence' => 'HTTP 200 em http://host.docker.internal:3010/api/config',
        'error_message' => 'context deadline exceeded contacting host.docker.internal:3010',
    ]);

    expect($probe->route)->toBe('http://127.0.0.1:3010/api/config')
        ->and($probe->http_request)->toBe('GET http://127.0.0.1:3010/api/config HTTP/1.1')
        ->and($probe->evidence)->toBe('HTTP 200 em http://127.0.0.1:3010/api/config')
        ->and($probe->error_message)->toBe('context deadline exceeded contacting 127.0.0.1:3010');
});
