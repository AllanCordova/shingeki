<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Stack;
use App\Models\System;
use App\Models\User;
use Database\Seeders\Concerns\PublishesSeedCovers;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class VulnerableTargetSeeder extends Seeder
{
    use PublishesSeedCovers;
    use WithoutModelEvents;

    public const PROJECT_NAME = 'Pentest Lab';

    public const SYSTEM_NAME = 'Vulnerable PHP Target';

    private const PROJECT_COVER_FILE = 'pentest-lab.jpg';

    private const SYSTEM_COVER_FILE = 'vulnerable-php-target.jpg';

    public function run(): void
    {
        $user = User::query()->where('email', 'test@example.com')->first();

        if ($user === null) {
            return;
        }

        $targetUrl = rtrim((string) config('attacks.vulnerable_target_url'), '/');

        $project = Project::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'name' => self::PROJECT_NAME,
            ],
            [
                'description' => 'Local intentionally vulnerable app for DAST validation.',
                'cover_path' => $this->publishSeedCover(self::PROJECT_COVER_FILE),
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
                'repository_url' => 'https://github.com/AllanCordova/vulnerable-target',
            ],
        );

        $vanillaPhp = Stack::query()->where('slug', 'vanilla_php')->first();

        if ($vanillaPhp !== null) {
            $system->stacks()->sync([
                $vanillaPhp->id => ['is_primary' => true],
            ]);
        }
    }
}
