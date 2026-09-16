<?php

use App\Enums\Attack\AttackScanType;
use App\Models\Attack\Attack;
use App\Models\Attack\AttackDispatch;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;
use App\Services\Attack\AttackQueuePublisher;
use App\Support\AttackAcknowledgmentTerms;
use Illuminate\Support\Collection;
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
        expect($response->json('systems.0.dast_attack_ids'))->toBeNull();
        expect($response->json('systems.0.sast_attack_ids'))->toBeNull();
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

    test('updates catalog attack selection', function () {
        $admin = User::factory()->admin()->create();
        $dastAttack = Attack::factory()->for($admin)->create();
        Attack::factory()->for($admin)->create();
        $sastAttack = Attack::factory()->sast()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->putJson('/api/systems/'.$system->id.'/dispatch-settings', [
            'dast_start_path' => null,
            'dast_max_routes' => null,
            'dast_attack_ids' => [$dastAttack->id],
            'sast_attack_ids' => [$sastAttack->id],
        ])
            ->assertOk()
            ->assertJsonPath('system.dast_attack_ids', [$dastAttack->id])
            ->assertJsonPath('system.sast_attack_ids', [$sastAttack->id]);
    });

    test('clears catalog attack selection back to the full catalog', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'dast_attack_ids' => ['019e7121-0000-7000-8000-000000000001'],
            'sast_attack_ids' => ['019e7121-0000-7000-8000-000000000002'],
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/systems/'.$system->id.'/dispatch-settings', [
            'dast_start_path' => null,
            'dast_max_routes' => null,
            'dast_attack_ids' => null,
            'sast_attack_ids' => null,
        ])
            ->assertOk()
            ->assertJsonPath('system.dast_attack_ids', null)
            ->assertJsonPath('system.sast_attack_ids', null);
    });

    test('rejects catalog attack ids that are not in the catalog', function () {
        $admin = User::factory()->admin()->create();
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->putJson('/api/systems/'.$system->id.'/dispatch-settings', [
            'dast_start_path' => null,
            'dast_max_routes' => null,
            'dast_attack_ids' => ['019e7121-0000-7000-8000-000000000001'],
            'sast_attack_ids' => null,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'One or more selected attacks are not available for this scan.');
    });
});

describe('dispatch uses system settings', function () {
    test('applies system dast_start_path and dast_max_routes when omitted', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $attack = Attack::factory()->for($admin)->create();

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
            'attack_ids' => [$attack->id],
        ])
            ->assertAccepted()
            ->assertJsonPath('dispatch.start_path', '/checkout')
            ->assertJsonPath('dispatch.max_routes', 50);
    });

    test('applies system dast_attack_ids when omitted from dispatch', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $selected = Attack::factory()->for($admin)->create();
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'dast_attack_ids' => [$selected->id],
        ]);

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once()
            ->with(
                Mockery::type(AttackDispatch::class),
                Mockery::on(fn (System $queuedSystem) => $queuedSystem->is($system)),
                Mockery::on(fn (User $queuedUser) => $queuedUser->is($user)),
                Mockery::on(fn (Collection $attacks) => $attacks->pluck('id')->all() === [$selected->id]),
                AttackScanType::Dast,
                null,
            );

        $this->postJson('/api/projects/'.$project->id.'/systems/'.$system->id.'/attacks/dispatch', [
            'accepted_responsibility' => true,
            'accepted_legal_terms' => true,
            'terms_version' => AttackAcknowledgmentTerms::VERSION,
        ])
            ->assertAccepted()
            ->assertJsonPath('attacks_count', 1);
    });
});
