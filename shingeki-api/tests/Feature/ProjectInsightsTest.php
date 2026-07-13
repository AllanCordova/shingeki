<?php

use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\System;
use App\Models\SystemResult;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

describe('GET projects/{project}/dashboard', function () {
    test('returns aggregated dashboard metrics', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create(['name' => 'API']);

        $older = AttackDispatch::factory()->for($system)->for($user)->create([
            'dispatched_at' => now()->subDay(),
            'completed_at' => now()->subDay(),
            'findings_count' => 2,
        ]);

        $latest = AttackDispatch::factory()->for($system)->for($user)->create([
            'dispatched_at' => now(),
            'completed_at' => now(),
            'findings_count' => 1,
        ]);

        SystemResult::factory()->for($system)->create([
            'attack_dispatch_id' => $latest->id,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/projects/'.$project->id.'/dashboard')
            ->assertOk()
            ->assertJsonPath('dashboard.systems_count', 1)
            ->assertJsonPath('dashboard.total_findings', 1)
            ->assertJsonPath('dashboard.previous_total_findings', 2)
            ->assertJsonPath('dashboard.findings_trend', -1)
            ->assertJsonPath('dashboard.trend_direction', 'down')
            ->assertJsonPath('dashboard.last_dispatch.id', $latest->id)
            ->assertJsonCount(1, 'dashboard.systems_with_findings');
    });
});

describe('GET system-results/compare', function () {
    test('compares findings between two dispatches', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        $baseline = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now()->subDay(),
            'findings_count' => 1,
        ]);

        $target = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now(),
            'findings_count' => 1,
        ]);

        SystemResult::factory()->for($system)->create([
            'attack_dispatch_id' => $baseline->id,
            'vulnerable_route' => '/old',
            'payload_used' => 'old-payload',
        ]);

        SystemResult::factory()->for($system)->create([
            'attack_dispatch_id' => $target->id,
            'vulnerable_route' => '/new',
            'payload_used' => 'new-payload',
        ]);

        Sanctum::actingAs($user);

        $this->getJson(
            '/api/projects/'.$project->id.'/systems/'.$system->id.'/system-results/compare'
            .'?baseline_id='.$baseline->id.'&target_id='.$target->id,
        )
            ->assertOk()
            ->assertJsonPath('summary.new', 1)
            ->assertJsonPath('summary.resolved', 1)
            ->assertJsonPath('summary.persisted', 0);
    });
});

describe('sidebar navigation', function () {
    test('user can configure sidebar visibility and order', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create(['name' => 'Alpha']);
        $system = System::factory()->for($project)->create(['name' => 'Beta']);

        Sanctum::actingAs($user);

        $this->getJson('/api/navigation/sidebar')
            ->assertOk()
            ->assertJsonPath('meta.projects_count', 1)
            ->assertJsonPath('meta.systems_count', 1)
            ->assertJsonCount(2, 'items');

        $this->putJson('/api/navigation/sidebar', [
            'items' => [
                [
                    'project_id' => $project->id,
                    'system_id' => null,
                    'visible' => true,
                    'sort_order' => 0,
                ],
                [
                    'project_id' => $project->id,
                    'system_id' => $system->id,
                    'visible' => false,
                    'sort_order' => 1,
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('items.1.visible', false);

        $this->getJson('/api/navigation/sidebar')
            ->assertOk()
            ->assertJsonCount(1, 'sidebar')
            ->assertJsonPath('sidebar.0.systems', []);
    });
});
