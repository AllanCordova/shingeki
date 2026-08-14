<?php

use App\Models\Identity\User;
use App\Models\Identity\UserCoverUpload;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

const COVER_UPLOADS_INDEX = '/api/cover-uploads';

function coverUploadUrl(UserCoverUpload $upload): string
{
    return COVER_UPLOADS_INDEX.'/'.$upload->id;
}

describe('GET /api/cover-uploads', function () {
    test('lists authenticated user cover library', function () {
        $user = User::factory()->create();
        $uploads = UserCoverUpload::factory()->count(2)->for($user)->create();

        Sanctum::actingAs($user);

        $this->getJson(COVER_UPLOADS_INDEX)
            ->assertOk()
            ->assertJson([
                'limit' => config('covers.max_uploads_per_user'),
                'count' => 2,
            ])
            ->assertJsonCount(2, 'cover_uploads');

        $returnedIds = collect($this->getJson(COVER_UPLOADS_INDEX)->json('cover_uploads'))
            ->pluck('id')
            ->all();

        expect($returnedIds)->toEqualCanonicalizing($uploads->pluck('id')->all());
    });

    test('requires authentication', function () {
        $this->getJson(COVER_UPLOADS_INDEX)->assertUnauthorized();
    });
});

describe('library accumulation', function () {
    test('keeps multiple uploads when creating projects with different covers', function () {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $first = $this->post('/api/projects', [
            'name' => 'Project One',
            'description' => 'First cover.',
            'cover' => UploadedFile::fake()->create('one.jpg', 100, 'image/jpeg'),
        ])->assertCreated();

        $second = $this->post('/api/projects', [
            'name' => 'Project Two',
            'description' => 'Second cover.',
            'cover' => UploadedFile::fake()->create('two.jpg', 100, 'image/jpeg'),
        ])->assertCreated();

        $firstPath = $first->json('project.cover_path');
        $secondPath = $second->json('project.cover_path');

        expect($firstPath)->not->toBe($secondPath);

        $this->getJson(COVER_UPLOADS_INDEX)
            ->assertOk()
            ->assertJsonPath('count', 2);

        $this->assertDatabaseHas('user_cover_uploads', ['user_id' => $user->id, 'path' => $firstPath]);
        $this->assertDatabaseHas('user_cover_uploads', ['user_id' => $user->id, 'path' => $secondPath]);
    });

    test('keeps previous library upload when project cover is changed', function () {
        Storage::fake('public');

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create([
            'cover_path' => '/storage/covers/original.jpg',
        ]);

        UserCoverUpload::factory()->for($user)->create([
            'path' => '/storage/covers/original.jpg',
        ]);

        Storage::disk('public')->put('covers/original.jpg', 'original');

        Sanctum::actingAs($user);

        $this->put('/api/projects/'.$project->id, [
            'cover' => UploadedFile::fake()->create('new.jpg', 100, 'image/jpeg'),
        ])->assertOk();

        $this->assertDatabaseCount('user_cover_uploads', 2);
        $this->assertDatabaseHas('user_cover_uploads', [
            'user_id' => $user->id,
            'path' => '/storage/covers/original.jpg',
        ]);
    });
});

describe('library limit', function () {
    test('rejects new upload when user already has 20 images in library', function () {
        Storage::fake('public');

        $user = User::factory()->create();
        UserCoverUpload::factory()->count(20)->for($user)->create();

        Sanctum::actingAs($user);

        $this->post('/api/projects', [
            'name' => 'Blocked Project',
            'description' => 'Should fail.',
            'cover' => UploadedFile::fake()->create('cover.jpg', 100, 'image/jpeg'),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cover']);
    });

    test('allows create when selecting existing library image at limit', function () {
        $user = User::factory()->create();
        $upload = UserCoverUpload::factory()->count(20)->for($user)->create()->first();

        Sanctum::actingAs($user);

        $this->post('/api/projects', [
            'name' => 'Reused Cover Project',
            'description' => 'Uses library image.',
            'cover_upload_id' => $upload->id,
        ])
            ->assertCreated()
            ->assertJsonPath('project.cover_path', $upload->path);
    });
});

describe('DELETE /api/cover-uploads/{coverUpload}', function () {
    test('removes unused upload from library and storage', function () {
        Storage::fake('public');

        $user = User::factory()->create();
        $upload = UserCoverUpload::factory()->for($user)->create([
            'path' => '/storage/covers/remove-me.jpg',
        ]);
        Storage::disk('public')->put('covers/remove-me.jpg', 'data');

        Sanctum::actingAs($user);

        $this->deleteJson(coverUploadUrl($upload))
            ->assertOk();

        $this->assertDatabaseMissing('user_cover_uploads', ['id' => $upload->id]);
        Storage::disk('public')->assertMissing('covers/remove-me.jpg');
    });

    test('removes library entry but keeps file when image is used by a project', function () {
        Storage::fake('public');

        $user = User::factory()->create();
        $upload = UserCoverUpload::factory()->for($user)->create([
            'path' => '/storage/covers/in-use.jpg',
        ]);
        Storage::disk('public')->put('covers/in-use.jpg', 'data');
        Project::factory()->for($user)->create(['cover_path' => $upload->path]);

        Sanctum::actingAs($user);

        $this->deleteJson(coverUploadUrl($upload))
            ->assertOk();

        $this->assertDatabaseMissing('user_cover_uploads', ['id' => $upload->id]);
        Storage::disk('public')->assertExists('covers/in-use.jpg');
        $this->assertDatabaseHas('projects', ['cover_path' => $upload->path]);
    });

    test('returns not found for another users upload', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $upload = UserCoverUpload::factory()->for($owner)->create();

        Sanctum::actingAs($intruder);

        $this->deleteJson(coverUploadUrl($upload))->assertNotFound();
    });
});

describe('project delete cascade', function () {
    test('deletes cover files from project and its systems when unused elsewhere', function () {
        Storage::fake('public');

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create([
            'cover_path' => '/storage/covers/project-only.jpg',
        ]);
        $system = System::factory()->for($project)->create([
            'cover_path' => '/storage/covers/system-only.jpg',
        ]);

        UserCoverUpload::factory()->for($user)->create(['path' => $project->cover_path]);
        UserCoverUpload::factory()->for($user)->create(['path' => $system->cover_path]);

        Storage::disk('public')->put('covers/project-only.jpg', 'p');
        Storage::disk('public')->put('covers/system-only.jpg', 's');

        Sanctum::actingAs($user);

        $this->deleteJson('/api/projects/'.$project->id)->assertOk();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('systems', ['id' => $system->id]);
        Storage::disk('public')->assertMissing('covers/project-only.jpg');
        Storage::disk('public')->assertMissing('covers/system-only.jpg');
        $this->assertDatabaseMissing('user_cover_uploads', ['path' => '/storage/covers/project-only.jpg']);
        $this->assertDatabaseMissing('user_cover_uploads', ['path' => '/storage/covers/system-only.jpg']);
    });

    test('keeps shared cover file when still used by another project', function () {
        Storage::fake('public');

        $user = User::factory()->create();
        $sharedPath = '/storage/covers/shared.jpg';

        $projectToDelete = Project::factory()->for($user)->create(['cover_path' => $sharedPath]);
        System::factory()->for($projectToDelete)->create(['cover_path' => '/storage/covers/system-temp.jpg']);

        Project::factory()->for($user)->create(['cover_path' => $sharedPath]);

        UserCoverUpload::factory()->for($user)->create(['path' => $sharedPath]);
        Storage::disk('public')->put('covers/shared.jpg', 'shared');
        Storage::disk('public')->put('covers/system-temp.jpg', 'temp');

        Sanctum::actingAs($user);

        $this->deleteJson('/api/projects/'.$projectToDelete->id)->assertOk();

        Storage::disk('public')->assertExists('covers/shared.jpg');
        $this->assertDatabaseHas('user_cover_uploads', ['path' => $sharedPath]);
        Storage::disk('public')->assertMissing('covers/system-temp.jpg');
    });
});
