<?php

namespace Database\Seeders\Targets;

use App\Models\Project\Project;
use App\Models\System\Stack;
use App\Models\System\System;
use App\Models\User\User;
use Database\Seeders\Concerns\PublishesSeedCovers;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class JuiceShopSeeder extends Seeder
{
    use PublishesSeedCovers;
    use WithoutModelEvents;

    public const SYSTEM_NAME = 'OWASP Juice Shop';

    private const SYSTEM_COVER_FILE = 'owasp-juice-shop.jpg';

    public function run(): void
    {
        $targetUrl = rtrim((string) config('attacks.juice_shop_url'), '/');

        foreach (TargetsSeeder::users() as $user) {
            $this->seedLabForUser($user, $targetUrl);
        }
    }

    private function seedLabForUser(User $user, string $targetUrl): void
    {
        $project = Project::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'name' => TargetsSeeder::PROJECT_NAME,
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
                'cover_path' => $this->publishSeedCover(self::SYSTEM_COVER_FILE),
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
