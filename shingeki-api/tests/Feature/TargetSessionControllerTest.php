<?php

use App\Enums\TargetAccess\TargetAuthType;
use App\Models\Identity\User;
use App\Models\TargetAccess\SystemTargetSession;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use Laravel\Sanctum\Sanctum;

function targetSessionUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/target-session';
}

describe('system target session', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $this->getJson(targetSessionUrl($project, $system))
            ->assertUnauthorized();
    });

    test('returns disconnected when no session exists', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->getJson(targetSessionUrl($project, $system))
            ->assertOk()
            ->assertJson(['connected' => false]);
    });

    test('stores cookie session for target', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $response = $this->postJson(targetSessionUrl($project, $system), [
            'auth_type' => TargetAuthType::Cookie->value,
            'credential' => 'laravel_session=abc123; XSRF-TOKEN=xyz',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('connected', true)
            ->assertJsonPath('auth_type', 'cookie')
            ->assertJsonPath('header_names', ['Cookie']);

        $session = SystemTargetSession::query()->first();
        expect($session->headers['Cookie'])->toBe('laravel_session=abc123; XSRF-TOKEN=xyz');
    });

    test('stores bearer session with normalized authorization header', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(targetSessionUrl($project, $system), [
            'auth_type' => TargetAuthType::Bearer->value,
            'credential' => 'my-access-token',
        ])->assertCreated();

        $session = SystemTargetSession::query()->first();
        expect($session->headers['Authorization'])->toBe('Bearer my-access-token');
    });

    test('removes stored session', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        SystemTargetSession::factory()->for($user)->for($system)->create();

        Sanctum::actingAs($user);

        $this->deleteJson(targetSessionUrl($project, $system))
            ->assertOk();

        expect(SystemTargetSession::query()->count())->toBe(0);
    });
});
