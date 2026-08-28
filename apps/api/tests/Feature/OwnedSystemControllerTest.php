<?php

use App\Models\Attack\Attack;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;
use App\Services\Attack\AttackQueuePublisher;
use App\Support\AttackAcknowledgmentTerms;
use Laravel\Sanctum\Sanctum;

describe('GET /api/systems', function () {
    test('lists systems owned by the authenticated user', function () {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $project = Project::factory()->for($user)->create(['name' => 'Meu projeto']);
        $system = System::factory()->for($project)->create(['name' => 'API']);
        System::factory()->for(Project::factory()->for($other))->create();

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/systems');

        $response->assertOk();
        expect($response->json('systems'))->toHaveCount(1);
        expect($response->json('systems.0.id'))->toBe($system->id);
        expect($response->json('systems.0.project.name'))->toBe('Meu projeto');
        expect($response->json('systems.0.dast_start_path'))->toBeNull();
    });
});

describe('PUT /api/systems/{system}/dispatch-settings', function () {
    test('updates dast start path and max routes', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->putJson('/api/systems/'.$system->id.'/dispatch-settings', [
            'dast_start_path' => 'products',
            'dast_max_routes' => 50,
        ])
            ->assertOk()
            ->assertJsonPath('system.dast_start_path', '/products')
            ->assertJsonPath('system.dast_max_routes', 50);

        $this->assertDatabaseHas('systems', [
            'id' => $system->id,
            'dast_start_path' => '/products',
            'dast_max_routes' => 50,
        ]);
    });

    test('clears dast start path and max routes', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'dast_start_path' => '/products',
            'dast_max_routes' => 80,
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/systems/'.$system->id.'/dispatch-settings', [
            'dast_start_path' => null,
            'dast_max_routes' => null,
        ])
            ->assertOk()
            ->assertJsonPath('system.dast_start_path', null)
            ->assertJsonPath('system.dast_max_routes', null);
    });

    test('forbids updating another users system', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $system = System::factory()->for(Project::factory()->for($owner))->create();

        Sanctum::actingAs($intruder);

        $this->putJson('/api/systems/'.$system->id.'/dispatch-settings', [
            'dast_start_path' => '/admin',
            'dast_max_routes' => 10,
        ])->assertForbidden();
    });
});

describe('dispatch uses system settings', function () {
    test('applies system dast_start_path and dast_max_routes when omitted', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'dast_start_path' => '/checkout',
            'dast_max_routes' => 50,
        ]);

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once();

        $this->postJson('/api/projects/'.$project->id.'/systems/'.$system->id.'/attacks/dispatch', [
            'accepted_responsibility' => true,
            'accepted_legal_terms' => true,
            'terms_version' => AttackAcknowledgmentTerms::VERSION,
        ])
            ->assertAccepted()
            ->assertJsonPath('dispatch.start_path', '/checkout')
            ->assertJsonPath('dispatch.max_routes', 50);
    });
});
