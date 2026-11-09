<?php

use App\Enums\User\UserRole;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;
use Database\Seeders\DemoProjectsSeeder;
use Database\Seeders\StackCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('demo projects seeder replaces old projects with four public scanner targets', function () {
    $specialist = User::factory()->create([
        'email' => 'test@example.com',
        'role' => UserRole::Specialist,
    ]);

    User::factory()->create([
        'email' => 'admin@admin.com',
        'role' => UserRole::Admin,
    ]);

    Project::factory()->for($specialist)->create(['name' => 'Netflix']);

    $this->seed(StackCatalogSeeder::class);
    $this->seed(DemoProjectsSeeder::class);

    expect(Project::query()->where('name', 'Netflix')->exists())->toBeFalse();

    foreach (DemoProjectsSeeder::DEMO_USER_EMAILS as $email) {
        $user = User::query()->where('email', $email)->firstOrFail();

        expect(Project::query()->where('user_id', $user->id)->count())->toBe(1);

        $project = Project::query()
            ->where('user_id', $user->id)
            ->where('name', DemoProjectsSeeder::PROJECT_NAME)
            ->firstOrFail();

        $systems = System::query()->where('project_id', $project->id)->orderBy('name')->get();

        expect($project->cover_path)->toBe('/storage/covers/pentest-lab.jpg')
            ->and($systems)->toHaveCount(4)
            ->and($systems->pluck('target_url')->sort()->values()->all())->toBe([
                'http://testaspnet.vulnweb.com',
                'https://demo.owasp-juice.shop',
                'https://ginandjuice.shop',
                'https://public-firing-range.appspot.com',
            ])
            ->and($systems->every(fn (System $system) => $system->cover_path !== null && $system->stacks->count() === 1))->toBeTrue()
            ->and($systems->pluck('cover_path')->unique())->toHaveCount(4)
            ->and($systems->mapWithKeys(fn (System $system) => [$system->name => $system->cover_path])->all())->toBe([
                'Acunetix ASP.NET' => '/storage/covers/acunetix-aspnet.jpg',
                'Gin and Juice' => '/storage/covers/gin-and-juice.jpg',
                'Google Firing Range' => '/storage/covers/firing-range.jpg',
                'OWASP Juice Shop' => '/storage/covers/juice-shop.jpg',
            ]);
    }
});
