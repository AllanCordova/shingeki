<?php

use App\Enums\User\UserRole;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;
use Database\Seeders\DemoProjectsSeeder;
use Database\Seeders\StackCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('demo projects seeder creates four projects with four systems each for test and admin users', function () {
    User::factory()->create([
        'email' => 'test@example.com',
        'role' => UserRole::Specialist,
    ]);

    User::factory()->create([
        'email' => 'admin@admin.com',
        'role' => UserRole::Admin,
    ]);

    $this->seed(StackCatalogSeeder::class);
    $this->seed(DemoProjectsSeeder::class);

    foreach (DemoProjectsSeeder::DEMO_USER_EMAILS as $email) {
        $user = User::query()->where('email', $email)->firstOrFail();

        expect(Project::query()->where('user_id', $user->id)->count())->toBe(4);

        $netflix = Project::query()
            ->where('user_id', $user->id)
            ->where('name', 'Netflix')
            ->firstOrFail();

        expect($netflix->cover_path)->toBe('/storage/covers/netflix.jpg')
            ->and(System::query()->where('project_id', $netflix->id)->count())->toBe(4);

        $systems = System::query()->where('project_id', $netflix->id)->get();

        expect($systems->every(fn (System $system) => $system->cover_path !== null))->toBeTrue()
            ->and($systems->first()->stacks)->toHaveCount(1);
    }
});
