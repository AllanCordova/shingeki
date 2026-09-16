<?php

use App\Models\Project\Project;
use App\Models\System\Stack;
use App\Models\System\System;
use App\Models\User\User;
use Database\Seeders\StackCatalogSeeder;
use Database\Seeders\Targets\JuiceShopSeeder;
use Database\Seeders\Targets\TargetsSeeder;
use Database\Seeders\Targets\VulnerableTargetSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('juice shop seeder adds training system to pentest lab for test and admin users', function () {
    config([
        'attacks.vulnerable_target_url' => 'http://127.0.0.1:8090',
        'attacks.juice_shop_url' => 'http://127.0.0.1:3001',
    ]);

    foreach (TargetsSeeder::USER_EMAILS as $email) {
        User::factory()->create(['email' => $email]);
    }

    $this->seed(StackCatalogSeeder::class);
    $this->seed(VulnerableTargetSeeder::class);
    $this->seed(JuiceShopSeeder::class);

    $express = Stack::query()->where('slug', 'express')->firstOrFail();

    foreach (TargetsSeeder::USER_EMAILS as $email) {
        $user = User::query()->where('email', $email)->firstOrFail();

        $project = Project::query()
            ->where('user_id', $user->id)
            ->where('name', TargetsSeeder::PROJECT_NAME)
            ->firstOrFail();

        $system = System::query()
            ->where('project_id', $project->id)
            ->where('name', JuiceShopSeeder::SYSTEM_NAME)
            ->first();

        expect($system)->not->toBeNull()
            ->and($system->cover_path)->toBe('/storage/covers/owasp-juice-shop.jpg')
            ->and($system->target_url)->toBe('http://127.0.0.1:3001')
            ->and($system->repository_url)->toBe('https://github.com/juice-shop/juice-shop');

        $slugs = $system->fresh()->stacks->pluck('slug')->sort()->values();

        expect($slugs->all())->toBe(['angular', 'express']);

        $pivot = $system->stacks->firstWhere('id', $express->id);

        expect($pivot)->not->toBeNull()
            ->and((bool) $pivot->pivot->is_primary)->toBeTrue();
    }
});
