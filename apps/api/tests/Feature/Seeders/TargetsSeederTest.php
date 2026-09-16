<?php

use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;
use Database\Seeders\StackCatalogSeeder;
use Database\Seeders\Targets\JuiceShopSeeder;
use Database\Seeders\Targets\TargetsSeeder;
use Database\Seeders\Targets\VulnerableTargetSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('targets seeder creates both lab systems for test and admin users', function () {
    config([
        'attacks.vulnerable_target_url' => 'http://127.0.0.1:8090',
        'attacks.juice_shop_url' => 'http://127.0.0.1:3001',
    ]);

    foreach (TargetsSeeder::USER_EMAILS as $email) {
        User::factory()->create(['email' => $email]);
    }

    $this->seed(StackCatalogSeeder::class);
    $this->seed(TargetsSeeder::class);

    foreach (TargetsSeeder::USER_EMAILS as $email) {
        $user = User::query()->where('email', $email)->firstOrFail();

        $project = Project::query()
            ->where('user_id', $user->id)
            ->where('name', TargetsSeeder::PROJECT_NAME)
            ->first();

        expect($project)->not->toBeNull();

        $systemNames = System::query()
            ->where('project_id', $project->id)
            ->pluck('name')
            ->sort()
            ->values()
            ->all();

        expect($systemNames)->toBe([
            JuiceShopSeeder::SYSTEM_NAME,
            VulnerableTargetSeeder::SYSTEM_NAME,
        ]);
    }
});
