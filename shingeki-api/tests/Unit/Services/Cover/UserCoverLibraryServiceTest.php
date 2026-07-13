<?php

use App\Models\Project;
use App\Models\System;
use App\Models\User;
use App\Models\UserCoverUpload;
use App\Services\Cover\CoverImageService;
use App\Services\Cover\UserCoverLibraryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    $this->service = new UserCoverLibraryService(new CoverImageService);
});

function fakeCoverFile(): UploadedFile
{
    return UploadedFile::fake()->create('cover.jpg', 100, 'image/jpeg');
}

test('limit reads from config', function () {
    config(['covers.max_uploads_per_user' => 15]);

    expect((new UserCoverLibraryService(new CoverImageService))->limit())->toBe(15);
});

test('registerUpload adds entry and stores file', function () {
    $user = User::factory()->create();

    $upload = $this->service->registerUpload($user, fakeCoverFile());

    expect($upload->user_id)->toBe($user->id)
        ->and($upload->path)->toMatch('#^/storage/covers/[a-f0-9\-]+\.jpg$#');

    $this->assertDatabaseCount('user_cover_uploads', 1);
    Storage::disk('public')->assertExists(str_replace('/storage/', '', $upload->path));
});

test('registerUpload throws when user reaches library limit', function () {
    $user = User::factory()->create();
    config(['covers.max_uploads_per_user' => 2]);

    UserCoverUpload::factory()->count(2)->for($user)->create();

    expect(fn () => $this->service->registerUpload($user, fakeCoverFile()))
        ->toThrow(ValidationException::class);
});

test('resolveCoverForCreate uses new file or library id', function () {
    $user = User::factory()->create();
    $existing = UserCoverUpload::factory()->for($user)->create([
        'path' => '/storage/covers/existing.jpg',
    ]);

    $fromFile = $this->service->resolveCoverForCreate($user, fakeCoverFile(), null);
    $fromLibrary = $this->service->resolveCoverForCreate($user, null, $existing->id);

    expect($fromFile)->toMatch('#^/storage/covers/[a-f0-9\-]+\.jpg$#')
        ->and($fromLibrary)->toBe('/storage/covers/existing.jpg');
});

test('resolveCoverForCreate returns null when no cover is provided', function () {
    $user = User::factory()->create();

    expect($this->service->resolveCoverForCreate($user, null, null))->toBeNull();
});

test('resolvePathFromUploadId throws for unknown id', function () {
    $user = User::factory()->create();

    expect(fn () => $this->service->resolvePathFromUploadId($user, (string) Str::uuid()))
        ->toThrow(ValidationException::class);
});

test('deleteUpload removes unused upload and file', function () {
    $user = User::factory()->create();
    $upload = UserCoverUpload::factory()->for($user)->create([
        'path' => '/storage/covers/remove.jpg',
    ]);
    Storage::disk('public')->put('covers/remove.jpg', 'data');

    $this->service->deleteUpload($user, $upload);

    $this->assertDatabaseMissing('user_cover_uploads', ['id' => $upload->id]);
    Storage::disk('public')->assertMissing('covers/remove.jpg');
});

test('deleteUpload removes library entry but keeps file when path is in use', function () {
    $user = User::factory()->create();
    $upload = UserCoverUpload::factory()->for($user)->create([
        'path' => '/storage/covers/in-use.jpg',
    ]);
    Storage::disk('public')->put('covers/in-use.jpg', 'data');
    Project::factory()->for($user)->create(['cover_path' => $upload->path]);

    $this->service->deleteUpload($user, $upload);

    $this->assertDatabaseMissing('user_cover_uploads', ['id' => $upload->id]);
    Storage::disk('public')->assertExists('covers/in-use.jpg');
});

test('isPathInUseByUser detects project and system usage', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create([
        'cover_path' => '/storage/covers/project.jpg',
    ]);
    $systemPath = '/storage/covers/system.jpg';
    System::factory()->for($project)->create(['cover_path' => $systemPath]);

    expect($this->service->isPathInUseByUser($user->id, '/storage/covers/project.jpg'))->toBeTrue()
        ->and($this->service->isPathInUseByUser($user->id, $systemPath))->toBeTrue()
        ->and($this->service->isPathInUseByUser($user->id, '/storage/covers/unused.jpg'))->toBeFalse();
});

test('purgePathIfUnused removes library row and file when not referenced', function () {
    $user = User::factory()->create();
    UserCoverUpload::factory()->for($user)->create([
        'path' => '/storage/covers/orphan.jpg',
    ]);
    Storage::disk('public')->put('covers/orphan.jpg', 'data');

    $this->service->purgePathIfUnused($user->id, '/storage/covers/orphan.jpg');

    $this->assertDatabaseMissing('user_cover_uploads', ['path' => '/storage/covers/orphan.jpg']);
    Storage::disk('public')->assertMissing('covers/orphan.jpg');
});

test('purgePathIfUnused keeps shared path still in use', function () {
    $user = User::factory()->create();
    $shared = '/storage/covers/shared.jpg';

    UserCoverUpload::factory()->for($user)->create(['path' => $shared]);
    Project::factory()->for($user)->create(['cover_path' => $shared]);
    Storage::disk('public')->put('covers/shared.jpg', 'data');

    $this->service->purgePathIfUnused($user->id, $shared);

    $this->assertDatabaseHas('user_cover_uploads', ['path' => $shared]);
    Storage::disk('public')->assertExists('covers/shared.jpg');
});

test('releaseCoversForProject purges orphan covers after delete', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create([
        'cover_path' => '/storage/covers/project.jpg',
    ]);
    $system = System::factory()->for($project)->create([
        'cover_path' => '/storage/covers/system.jpg',
    ]);

    UserCoverUpload::factory()->for($user)->create(['path' => $project->cover_path]);
    UserCoverUpload::factory()->for($user)->create(['path' => $system->cover_path]);
    Storage::disk('public')->put('covers/project.jpg', 'p');
    Storage::disk('public')->put('covers/system.jpg', 's');

    $this->service->releaseCoversForProject($project);

    $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    $this->assertDatabaseMissing('systems', ['id' => $system->id]);
    Storage::disk('public')->assertMissing('covers/project.jpg');
    Storage::disk('public')->assertMissing('covers/system.jpg');
});
