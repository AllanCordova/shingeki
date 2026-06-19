<?php

use App\Models\Project;
use App\Models\System;
use App\Models\User;
use App\Services\TargetSession\TargetSessionCaptureService;
use Laravel\Sanctum\Sanctum;

test('starts same-origin popup capture flow', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create();
    $system = System::factory()->for($project)->create([
        'target_url' => 'http://localhost:3000',
    ]);

    Sanctum::actingAs($user);

    $response = $this->postJson(
        '/api/projects/'.$project->id.'/systems/'.$system->id.'/target-session/connect/start',
        ['client_origin' => 'http://localhost:3000'],
    );

    $response
        ->assertOk()
        ->assertJsonPath('mode', 'same_origin')
        ->assertJsonPath('popup_url', fn ($url) => str_contains($url, '/conectar-alvo?ticket='));
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
        ->assertJsonPath('popup_url', fn ($url) => str_contains($url, 'login.php'))
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
