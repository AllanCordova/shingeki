<?php

use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\TargetSession\SystemTargetSession;
use App\Models\User\User;
use App\Services\TargetSession\TargetSessionCaptureService;
use Laravel\Sanctum\Sanctum;

test('starts same-origin capture without platform auth shortcut', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create();
    $system = System::factory()->for($project)->create([
        'target_url' => 'http://localhost:3000',
        'login_url' => 'http://localhost:3000/login',
    ]);

    Sanctum::actingAs($user);

    $response = $this->postJson(
        '/api/projects/'.$project->id.'/systems/'.$system->id.'/target-session/connect/start',
        ['client_origin' => 'http://localhost:3000'],
    );

    $response
        ->assertOk()
        ->assertJsonPath('mode', 'same_origin')
        ->assertJsonPath('extension_supported', true)
        ->assertJsonPath('open_url', 'http://localhost:3000/login')
        ->assertJsonPath('popup_url', fn ($url) => $url === 'http://localhost:3000/login'
            && ! str_contains((string) $url, '/conectar-alvo'));
});

test('starts external popup capture flow with login redirect', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create();
    $system = System::factory()->for($project)->create([
        'target_url' => 'http://127.0.0.1:8090',
        'login_url' => 'http://127.0.0.1:8090/login.php',
    ]);

    Sanctum::actingAs($user);

    $response = $this->postJson(
        '/api/projects/'.$project->id.'/systems/'.$system->id.'/target-session/connect/start',
        ['client_origin' => 'http://localhost:3000'],
    );

    $response
        ->assertOk()
        ->assertJsonPath('mode', 'external')
        ->assertJsonPath('open_url', 'http://127.0.0.1:8090/login.php')
        ->assertJsonPath('extension_supported', true)
        ->assertJsonPath('capture_api_base', fn ($url) => str_ends_with((string) $url, '/api'))
        ->assertJsonPath('popup_url', fn ($url) => str_contains($url, 'login.php')
            && str_contains($url, 'next=')
            && str_contains(urldecode($url), '/shingeki-capture.php'))
        ->assertJsonPath('capture_callback_url', fn ($url) => str_contains($url, 'shingeki-capture.php'));
});

test('completes capture from ticket with cookie header', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create();
    $system = System::factory()->for($project)->create();

    $start = app(TargetSessionCaptureService::class)->start(
        $user,
        $system,
        'http://localhost:3000',
    );

    $response = $this->postJson('/api/target-session/capture/'.$start['ticket'], [
        'cookie' => 'PHPSESSID=abc123',
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('connected', true)
        ->assertJsonPath('auth_type', 'cookie');
});

test('rejects platform sanctum token as target capture credential', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create();
    $system = System::factory()->for($project)->create();
    $plainTextToken = $user->createToken('auth-token')->plainTextToken;

    $start = app(TargetSessionCaptureService::class)->start(
        $user,
        $system,
        'http://localhost:3000',
    );

    $this->postJson('/api/target-session/capture/'.$start['ticket'], [
        'authorization' => 'Bearer '.$plainTextToken,
    ])
        ->assertStatus(422)
        ->assertJsonPath(
            'message',
            'Platform API tokens cannot be used as target session credentials.',
        );

    expect(SystemTargetSession::query()->count())->toBe(0);
});
