<?php

use App\Models\Project\Project;
use App\Models\System\Stack;
use App\Models\System\System;
use App\Models\User\User;
use Database\Seeders\JuiceShopSeeder;
use Database\Seeders\StackCatalogSeeder;
use Database\Seeders\VulnerableTargetSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('juice shop seeder adds training system to pentest lab', function () {
    config([
        'attacks.vulnerable_target_url' => 'http://127.0.0.1:8090',
        'attacks.juice_shop_url' => 'http://127.0.0.1:3001',
    ]);

    User::factory()->create(['email' => 'test@example.com']);

    $this->seed(StackCatalogSeeder::class);
    $this->seed(VulnerableTargetSeeder::class);
    $this->seed(JuiceShopSeeder::class);

    $user = User::query()->where('email', 'test@example.com')->firstOrFail();

    $project = Project::query()
        ->where('user_id', $user->id)
        ->where('name', JuiceShopSeeder::PROJECT_NAME)
        ->firstOrFail();

    $system = System::query()
        ->where('project_id', $project->id)
        ->where('name', JuiceShopSeeder::SYSTEM_NAME)
        ->first();

    expect($system)->not->toBeNull()
        ->and($system->target_url)->toBe('http://127.0.0.1:3001')
        ->and($system->repository_url)->toBe('https://github.com/juice-shop/juice-shop');

    $slugs = $system->fresh()->stacks->pluck('slug')->sort()->values();

    expect($slugs->all())->toBe(['angular', 'express']);

    $express = Stack::query()->where('slug', 'express')->firstOrFail();
    $pivot = $system->stacks->firstWhere('id', $express->id);

    expect($pivot)->not->toBeNull()
        ->and((bool) $pivot->pivot->is_primary)->toBeTrue();
});
