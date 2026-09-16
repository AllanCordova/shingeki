<?php

use App\Models\Project\Project;
use App\Models\System\Stack;
use App\Models\System\System;
use App\Models\User\User;
use Database\Seeders\AttackCatalogSeeder;
use Database\Seeders\RemediationCatalogSeeder;
use Database\Seeders\StackCatalogSeeder;
use Database\Seeders\Targets\TargetsSeeder;
use Database\Seeders\Targets\VulnerableTargetSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('vulnerable target seeder creates lab project and system for test and admin users', function () {
    config([
        'attacks.vulnerable_target_url' => 'http://127.0.0.1:8090',
    ]);

    User::factory()->create(['email' => 'test@example.com']);

    $this->seed(AttackCatalogSeeder::class);
    $this->seed(StackCatalogSeeder::class);
    $this->seed(RemediationCatalogSeeder::class);
    $this->seed(VulnerableTargetSeeder::class);

    $vanillaPhp = Stack::query()->where('slug', 'vanilla_php')->firstOrFail();

    foreach (TargetsSeeder::USER_EMAILS as $email) {
        $user = User::query()->where('email', $email)->firstOrFail();

        $project = Project::query()
            ->where('user_id', $user->id)
            ->where('name', TargetsSeeder::PROJECT_NAME)
            ->first();

        expect($project)->not->toBeNull();

        $system = System::query()
            ->where('project_id', $project->id)
            ->where('name', VulnerableTargetSeeder::SYSTEM_NAME)
            ->first();

        expect($system)->not->toBeNull()
            ->and($project->cover_path)->toBe('/storage/covers/pentest-lab.jpg')
            ->and($system->cover_path)->toBe('/storage/covers/vulnerable-php-target.jpg')
            ->and($system->target_url)->toBe('http://127.0.0.1:8090');

        expect($system->fresh()->stacks)->toHaveCount(1)
            ->and($system->stacks->first()->id)->toBe($vanillaPhp->id)
            ->and($system->stacks->first()->slug)->toBe('vanilla_php');
    }
});
