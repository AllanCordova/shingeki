<?php

namespace Database\Seeders;

use App\Models\Project\Project;
use App\Models\System\Stack;
use App\Models\System\System;
use App\Models\User\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class JuiceShopSeeder extends Seeder
{
    use WithoutModelEvents;

    public const PROJECT_NAME = VulnerableTargetSeeder::PROJECT_NAME;

    public const SYSTEM_NAME = 'OWASP Juice Shop';

    public function run(): void
    {
        $user = User::query()->where('email', 'test@example.com')->first();

        if ($user === null) {
            return;
        }

        $targetUrl = rtrim((string) config('attacks.juice_shop_url'), '/');

        $project = Project::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'name' => self::PROJECT_NAME,
            ],
            [
                'description' => 'Local intentionally vulnerable apps for DAST validation and training.',
            ],
        );

        $system = System::query()->updateOrCreate(
            [
                'project_id' => $project->id,
                'name' => self::SYSTEM_NAME,
            ],
            [
                'target_url' => $targetUrl,
                'repository_url' => 'https://github.com/juice-shop/juice-shop',
            ],
        );

        $express = Stack::query()->where('slug', 'express')->first();
        $angular = Stack::query()->where('slug', 'angular')->first();

        $sync = [];
        if ($express !== null) {
            $sync[$express->id] = ['is_primary' => true];
        }
        if ($angular !== null) {
            $sync[$angular->id] = ['is_primary' => false];
        }

        if ($sync !== []) {
            $system->stacks()->sync($sync);
        }
    }
}
