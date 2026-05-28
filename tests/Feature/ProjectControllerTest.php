<?php

use App\Models\Project;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

const PROJECTS_INDEX = '/api/projects';
const PROJECTS_STORE = '/api/projects';

function projectUrl(Project $project): string
{
    return '/api/projects/'.$project->id;
}

function validProjectPayload(array $overrides = []): array
{
    return array_merge([
        'cover_path' => '/storage/covers/app.png',
        'name' => 'Pentest Project',
        'description' => 'Application security assessment scope.',
    ], $overrides);
}

function projectJsonStructure(): array
{
    return [
        'id',
        'user_id',
        'cover_path',
        'name',
        'description',
        'created_at',
        'updated_at',
    ];
}

describe('authentication', function () {
    test('requires authentication for all project routes', function (string $method, string $uri) {
        $project = Project::factory()->create();

        $url = $uri === '{project}' ? projectUrl($project) : $uri;

        $this->json($method, $url)->assertUnauthorized();
    })->with([
        'index' => ['GET', PROJECTS_INDEX],
        'store' => ['POST', PROJECTS_STORE],
        'show' => ['GET', '{project}'],
        'update' => ['PUT', '{project}'],
        'destroy' => ['DELETE', '{project}'],
    ]);
});

describe('GET /api/projects', function () {
    test('lists only authenticated user projects', function () {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $owned = Project::factory()->count(2)->for($user)->create();
        Project::factory()->count(3)->for($otherUser)->create();

        Sanctum::actingAs($user);

        $response = $this->getJson(PROJECTS_INDEX);

        $response
            ->assertOk()
            ->assertJsonCount(2, 'projects')
            ->assertJsonStructure(['projects' => ['*' => projectJsonStructure()]]);

        $returnedIds = collect($response->json('projects'))->pluck('id')->all();

        expect($returnedIds)->toEqualCanonicalizing($owned->pluck('id')->all());
    });

    test('returns empty list when user has no projects', function () {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson(PROJECTS_INDEX)
            ->assertOk()
            ->assertJson(['projects' => []]);
    });
});

describe('POST /api/projects', function () {
    test('creates a project for authenticated user', function () {
        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $response = $this->postJson(PROJECTS_STORE, validProjectPayload());

        $response
            ->assertCreated()
            ->assertJson([
                'message' => 'Project created successfully.',
                'project' => [
                    'user_id' => $user->id,
                    'cover_path' => '/storage/covers/app.png',
                    'name' => 'Pentest Project',
                    'description' => 'Application security assessment scope.',
                ],
            ])
            ->assertJsonStructure([
                'message',
                'project' => projectJsonStructure(),
            ]);

        $this->assertDatabaseHas('projects', [
            'user_id' => $user->id,
            'name' => 'Pentest Project',
            'cover_path' => '/storage/covers/app.png',
        ]);
    });

    test('rejects invalid payload', function (array $payload, array $errors) {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson(PROJECTS_STORE, $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors($errors);
    })->with([
        'missing cover_path' => [
            validProjectPayload(['cover_path' => null]),
            ['cover_path'],
        ],
        'missing name' => [
            validProjectPayload(['name' => null]),
            ['name'],
        ],
        'missing description' => [
            validProjectPayload(['description' => null]),
            ['description'],
        ],
    ]);
});

describe('GET /api/projects/{project}', function () {
    test('shows authenticated user project', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create([
            'name' => 'Visible Project',
        ]);

        Sanctum::actingAs($user);

        $this->getJson(projectUrl($project))
            ->assertOk()
            ->assertJson([
                'project' => [
                    'id' => $project->id,
                    'name' => 'Visible Project',
                    'user_id' => $user->id,
                ],
            ])
            ->assertJsonStructure(['project' => projectJsonStructure()]);
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();

        Sanctum::actingAs($intruder);

        $this->getJson(projectUrl($project))->assertNotFound();
    });
});

describe('PUT /api/projects/{project}', function () {
    test('updates project fields', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create([
            'name' => 'Old Name',
            'description' => 'Old description.',
        ]);

        Sanctum::actingAs($user);

        $this->putJson(projectUrl($project), [
            'name' => 'New Name',
            'description' => 'New description.',
            'cover_path' => '/storage/covers/updated.png',
        ])
            ->assertOk()
            ->assertJson([
                'message' => 'Project updated successfully.',
                'project' => [
                    'name' => 'New Name',
                    'description' => 'New description.',
                    'cover_path' => '/storage/covers/updated.png',
                ],
            ]);

        $project->refresh();

        expect($project->name)->toBe('New Name')
            ->and($project->description)->toBe('New description.')
            ->and($project->cover_path)->toBe('/storage/covers/updated.png');
    });

    test('updates only provided fields', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create([
            'name' => 'Keep Name',
            'description' => 'Keep description.',
            'cover_path' => '/storage/covers/original.png',
        ]);

        Sanctum::actingAs($user);

        $this->putJson(projectUrl($project), ['name' => 'Updated Name'])
            ->assertOk()
            ->assertJsonPath('project.name', 'Updated Name')
            ->assertJsonPath('project.description', 'Keep description.')
            ->assertJsonPath('project.cover_path', '/storage/covers/original.png');
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();

        Sanctum::actingAs($intruder);

        $this->putJson(projectUrl($project), ['name' => 'Hijacked'])
            ->assertNotFound();
    });
});

describe('DELETE /api/projects/{project}', function () {
    test('deletes authenticated user project', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();

        Sanctum::actingAs($user);

        $this->deleteJson(projectUrl($project))
            ->assertOk()
            ->assertJson(['message' => 'Project deleted successfully.']);

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();

        Sanctum::actingAs($intruder);

        $this->deleteJson(projectUrl($project))->assertNotFound();

        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    });
});
