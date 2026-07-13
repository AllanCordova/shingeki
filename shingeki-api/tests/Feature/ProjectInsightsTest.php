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

        $this->graphQL(/** @lang GraphQL */ '
            query {
                sidebarNavigation {
                    meta {
                        projectsCount
                        systemsCount
                    }
                    items {
                        type
                        projectId
                        systemId
                        name
                        visible
                        sortOrder
                    }
                    tree {
                        id
                        name
                        systems {
                            id
                            name
                        }
                    }
                }
            }
        ')
            ->assertGraphQLErrorFree()
            ->assertJsonPath('data.sidebarNavigation.meta.projectsCount', 1)
            ->assertJsonPath('data.sidebarNavigation.meta.systemsCount', 1)
            ->assertJsonCount(2, 'data.sidebarNavigation.items');

        $this->graphQL(/** @lang GraphQL */ '
            mutation ($items: [SidebarNavItemInput!]!) {
                syncSidebarNavigation(items: $items) {
                    items {
                        type
                        systemId
                        visible
                    }
                    tree {
                        id
                        systems {
                            id
                        }
                    }
                }
            }
        ', [
            'items' => [
                [
                    'projectId' => $project->id,
                    'systemId' => null,
                    'visible' => true,
                    'sortOrder' => 0,
                ],
                [
                    'projectId' => $project->id,
                    'systemId' => $system->id,
                    'visible' => false,
                    'sortOrder' => 1,
                ],
            ],
        ])
            ->assertGraphQLErrorFree()
            ->assertJsonPath('data.syncSidebarNavigation.items.1.visible', false);

        $this->graphQL(/** @lang GraphQL */ '
            query {
                sidebarNavigation {
                    tree {
                        id
                        systems {
                            id
                        }
                    }
                }
            }
        ')
            ->assertGraphQLErrorFree()
            ->assertJsonCount(1, 'data.sidebarNavigation.tree')
            ->assertJsonPath('data.sidebarNavigation.tree.0.systems', []);
    });
});
