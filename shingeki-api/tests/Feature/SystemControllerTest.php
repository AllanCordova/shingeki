<?php

use App\Models\Project;
use App\Models\System;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function systemsIndexUrl(Project $project): string
{
    return '/api/projects/'.$project->id.'/systems';
}

function systemUrl(Project $project, System $system): string
{
    return systemsIndexUrl($project).'/'.$system->id;
}

function validSystemPayload(array $overrides = []): array
{
    return array_merge([
        'cover_path' => '/storage/covers/api.png',
        'name' => 'Main API',
        'target_url' => 'https://app.example.com',
        'repository_url' => 'https://github.com/org/api',
    ], $overrides);
}

function systemJsonStructure(): array
{
    return [
        'id',
        'project_id',
        'cover_path',
        'name',
        'target_url',
        'repository_url',
        'created_at',
        'updated_at',
    ];
}

describe('authentication', function () {
    test('requires authentication for all system routes', function (string $method, string $uri) {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $url = match ($uri) {
            '{systems}' => systemsIndexUrl($project),
            '{system}' => systemUrl($project, $system),
            default => $uri,
        };

        $this->json($method, $url)->assertUnauthorized();
    })->with([
        'index' => ['GET', '{systems}'],
        'store' => ['POST', '{systems}'],
        'show' => ['GET', '{system}'],
        'update' => ['PUT', '{system}'],
        'destroy' => ['DELETE', '{system}'],
    ]);
});

describe('GET /api/projects/{project}/systems', function () {
    test('lists systems for authenticated user project', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $otherProject = Project::factory()->for($user)->create();

        $systems = System::factory()->count(2)->for($project)->create();
        System::factory()->count(3)->for($otherProject)->create();

        Sanctum::actingAs($user);

        $response = $this->getJson(systemsIndexUrl($project));

        $response
            ->assertOk()
            ->assertJsonCount(2, 'systems')
            ->assertJsonStructure(['systems' => ['*' => systemJsonStructure()]]);

        $returnedIds = collect($response->json('systems'))->pluck('id')->all();

        expect($returnedIds)->toEqualCanonicalizing($systems->pluck('id')->all());
    });

    test('returns empty list when project has no systems', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        Sanctum::actingAs($user);

        $this->getJson(systemsIndexUrl($project))
            ->assertOk()
            ->assertJson(['systems' => []]);
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();

        Sanctum::actingAs($intruder);

        $this->getJson(systemsIndexUrl($project))->assertNotFound();
    });
});

describe('POST /api/projects/{project}/systems', function () {
    test('creates a system for authenticated user project', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        Sanctum::actingAs($user);

        $response = $this->postJson(systemsIndexUrl($project), validSystemPayload());

        $response
            ->assertCreated()
            ->assertJson([
                'message' => 'System created successfully.',
                'system' => [
                    'project_id' => $project->id,
                    'name' => 'Main API',
                    'target_url' => 'https://app.example.com',
                    'repository_url' => 'https://github.com/org/api',
                ],
            ])
            ->assertJsonStructure([
                'message',
                'system' => systemJsonStructure(),
            ]);

        $this->assertDatabaseHas('systems', [
            'project_id' => $project->id,
            'name' => 'Main API',
        ]);
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();

        Sanctum::actingAs($intruder);

        $this->postJson(systemsIndexUrl($project), validSystemPayload())->assertNotFound();
    });

    test('rejects invalid payload', function (array $payload, array $errors) {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        Sanctum::actingAs($user);

        $this->postJson(systemsIndexUrl($project), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors($errors);
    })->with([
        'missing name' => [
            validSystemPayload(['name' => null]),
            ['name'],
        ],
        'invalid target_url' => [
            validSystemPayload(['target_url' => 'not-a-url']),
            ['target_url'],
        ],
        'invalid repository_url' => [
            validSystemPayload(['repository_url' => 'invalid']),
            ['repository_url'],
        ],
    ]);
});

describe('GET /api/projects/{project}/systems/{system}', function () {
    test('shows system belonging to project', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create(['name' => 'Visible System']);

        Sanctum::actingAs($user);

        $this->getJson(systemUrl($project, $system))
            ->assertOk()
            ->assertJson([
                'system' => [
                    'id' => $system->id,
                    'project_id' => $project->id,
                    'name' => 'Visible System',
                ],
            ])
            ->assertJsonStructure(['system' => systemJsonStructure()]);
    });

    test('returns not found when system belongs to another project', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $otherProject = Project::factory()->for($user)->create();
        $system = System::factory()->for($otherProject)->create();

        Sanctum::actingAs($user);

        $this->getJson(systemUrl($project, $system))->assertNotFound();
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($intruder);

        $this->getJson(systemUrl($project, $system))->assertNotFound();
    });
});

describe('PUT /api/projects/{project}/systems/{system}', function () {
    test('updates system fields', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'name' => 'Old System',
            'target_url' => 'https://old.example.com',
        ]);

        Sanctum::actingAs($user);

        $this->putJson(systemUrl($project, $system), [
            'name' => 'New System',
            'target_url' => 'https://new.example.com',
            'repository_url' => 'https://github.com/org/new-api',
            'cover_path' => '/storage/covers/new.png',
        ])
            ->assertOk()
            ->assertJson([
                'message' => 'System updated successfully.',
                'system' => [
                    'name' => 'New System',
                    'target_url' => 'https://new.example.com',
                ],
            ]);

        $system->refresh();

        expect($system->name)->toBe('New System')
            ->and($system->target_url)->toBe('https://new.example.com')
            ->and($system->repository_url)->toBe('https://github.com/org/new-api');
    });

    test('updates only provided fields', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'name' => 'Keep Name',
            'target_url' => 'https://keep.example.com',
        ]);

        Sanctum::actingAs($user);

        $this->putJson(systemUrl($project, $system), ['name' => 'Updated Name'])
            ->assertOk()
            ->assertJsonPath('system.name', 'Updated Name')
            ->assertJsonPath('system.target_url', 'https://keep.example.com');
    });

    test('returns not found when system belongs to another project', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $otherProject = Project::factory()->for($user)->create();
        $system = System::factory()->for($otherProject)->create();

        Sanctum::actingAs($user);

        $this->putJson(systemUrl($project, $system), ['name' => 'Hijacked'])->assertNotFound();
    });
});

describe('DELETE /api/projects/{project}/systems/{system}', function () {
    test('deletes system from project', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->deleteJson(systemUrl($project, $system))
            ->assertOk()
            ->assertJson(['message' => 'System deleted successfully.']);

        $this->assertDatabaseMissing('systems', ['id' => $system->id]);
    });

    test('returns not found when system belongs to another project', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $otherProject = Project::factory()->for($user)->create();
        $system = System::factory()->for($otherProject)->create();

        Sanctum::actingAs($user);

        $this->deleteJson(systemUrl($project, $system))->assertNotFound();

        $this->assertDatabaseHas('systems', ['id' => $system->id]);
    });
});
