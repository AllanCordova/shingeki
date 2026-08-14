<?php

use App\Http\Resources\Identity\UserResource;
use App\Http\Resources\Workspace\ProjectResource;
use App\Http\Resources\Workspace\SystemResource;
use App\Models\Catalog\Stack;
use App\Models\Identity\User;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;

test('user resource keeps the public auth contract', function () {
    $user = User::factory()->create();

    expect(UserResource::make($user)->resolve())->toHaveKeys([
        'id',
        'name',
        'email',
        'avatar_path',
        'role',
        'created_at',
        'updated_at',
    ])->and(UserResource::make($user)->resolve()['role'])->toBe($user->role->value);
});

test('project resource keeps the public workspace contract', function () {
    $project = Project::factory()->create();

    expect(ProjectResource::make($project)->resolve())->toHaveKeys([
        'id',
        'user_id',
        'cover_path',
        'name',
        'description',
        'created_at',
        'updated_at',
    ]);
});

test('system resource keeps the public workspace contract', function () {
    $system = System::factory()->create();
    $stack = Stack::query()->firstOrCreate(
        ['slug' => 'laravel'],
        ['name' => 'Laravel', 'languages' => ['php']],
    );
    $system->stacks()->sync([$stack->id => ['is_primary' => true]]);
    $system->load('stacks');

    $payload = SystemResource::make($system)->resolve();

    expect($payload)->toHaveKeys([
        'id',
        'project_id',
        'cover_path',
        'name',
        'target_url',
        'login_url',
        'repository_url',
        'stacks',
        'created_at',
        'updated_at',
    ])
        ->and($payload['stacks'][0])->toHaveKeys(['id', 'slug', 'name', 'is_primary'])
        ->and($payload['stacks'][0]['is_primary'])->toBeTrue();
});
