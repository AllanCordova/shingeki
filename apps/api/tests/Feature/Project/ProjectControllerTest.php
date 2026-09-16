<?php

use App\Models\Project\Project;
use App\Models\User\User;
use App\Models\User\UserCoverUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

const PROJECTS_INDEX = '/api/projects';
const PROJECTS_STORE = '/api/projects';

function projectUrl(Project $project): string
{
    return '/api/projects/'.$project->id;
}

/**
 * @param  array<string, mixed>  $fields
 */
function validProjectFields(array $overrides = []): array
{
    return array_merge([
        'name' => 'Pentest Project',
        'description' => 'Application security assessment scope.',
    ], $overrides);
}

function fakeCover(): UploadedFile
{
    return UploadedFile::fake()->create('cover.jpg', 100, 'image/jpeg');
}

/**
 * @param  array<string, mixed>  $fields
 */
function postProject(array $fields = [], ?UploadedFile $cover = null)
{
    $payload = validProjectFields($fields);

    if ($cover !== null) {
        $payload['cover'] = $cover;
    }

    return test()->post(PROJECTS_STORE, $payload);
}

/**
 * @param  array<string, mixed>  $fields
 */
function putProject(Project $project, array $fields = [], ?UploadedFile $cover = null)
{
    return test()->put(projectUrl($project), [
        ...$fields,
        ...($cover !== null ? ['cover' => $cover] : []),
    ]);
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
    test('creates a project using an existing library upload', function () {
        $user = User::factory()->create();
        $upload = UserCoverUpload::factory()->for($user)->create([
            'path' => '/storage/covers/library-pick.jpg',
        ]);

        Sanctum::actingAs($user);

        $this->post(PROJECTS_STORE, [
            'name' => 'Library Project',
            'description' => 'Uses saved upload.',
            'cover_upload_id' => $upload->id,
        ])
            ->assertCreated()
            ->assertJsonPath('project.cover_path', '/storage/covers/library-pick.jpg');
    });

    test('creates a project for authenticated user with uploaded cover', function () {
        Storage::fake('public');

        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $response = postProject([], fakeCover());

        $response
            ->assertCreated()
            ->assertJson([
                'message' => 'Project created successfully.',
                'project' => [
                    'user_id' => $user->id,
                    'name' => 'Pentest Project',
                    'description' => 'Application security assessment scope.',
                ],
            ])
            ->assertJsonStructure([
                'message',
                'project' => projectJsonStructure(),
            ]);

        $coverPath = $response->json('project.cover_path');

        expect($coverPath)->toMatch('#^/storage/covers/[a-f0-9\-]+\.jpg$#');

        $relativePath = str_replace('/storage/', '', $coverPath);
        Storage::disk('public')->assertExists($relativePath);

        $this->assertDatabaseHas('projects', [
            'user_id' => $user->id,
            'name' => 'Pentest Project',
            'cover_path' => $coverPath,
        ]);

        $this->assertDatabaseHas('user_cover_uploads', [
            'user_id' => $user->id,
            'path' => $coverPath,
        ]);
    });

    test('creates a project without cover', function () {
        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $this->post(PROJECTS_STORE, validProjectFields())
            ->assertCreated()
            ->assertJsonPath('project.cover_path', null)
            ->assertJsonPath('project.name', 'Pentest Project');
    });

    test('rejects missing name', function () {
        Sanctum::actingAs(User::factory()->create());

        $this->post(PROJECTS_STORE, [
            ...validProjectFields(['name' => null]),
            'cover' => fakeCover(),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    });

    test('rejects invalid cover type', function () {
        Sanctum::actingAs(User::factory()->create());

        $this->post(PROJECTS_STORE, [
            ...validProjectFields(),
            'cover' => UploadedFile::fake()->create('notes.txt', 100, 'text/plain'),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cover']);
    });
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
        ])
            ->assertOk()
            ->assertJson([
                'message' => 'Project updated successfully.',
                'project' => [
                    'name' => 'New Name',
                    'description' => 'New description.',
                ],
            ]);

        $project->refresh();

        expect($project->name)->toBe('New Name')
            ->and($project->description)->toBe('New description.');
    });

    test('replaces cover when a new image is uploaded', function () {
        Storage::fake('public');

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create([
            'cover_path' => '/storage/covers/original.png',
        ]);

        UserCoverUpload::factory()->for($user)->create([
            'path' => '/storage/covers/original.png',
        ]);

        Storage::disk('public')->put('covers/original.png', 'original');

        Sanctum::actingAs($user);

        $response = putProject($project, [], fakeCover());

        $response->assertOk();

        $newCoverPath = $response->json('project.cover_path');

        expect($newCoverPath)->toMatch('#^/storage/covers/[a-f0-9\-]+\.jpg$#')
            ->and($newCoverPath)->not->toBe('/storage/covers/original.png');

        Storage::disk('public')->assertExists('covers/original.png');
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $newCoverPath));
        $this->assertDatabaseCount('user_cover_uploads', 2);
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
