<?php

namespace Database\Seeders;

use App\Enums\TargetAccess\SignatureStatus;
use App\Models\Catalog\Stack;
use App\Models\Identity\User;
use App\Models\TargetAccess\Signature;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
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
        $signatureToken = (string) config('attacks.vulnerable_target_signature_token');

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

        Signature::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'system_id' => $system->id,
            ],
            [
                'ip_address' => '127.0.0.1',
                'token' => $signatureToken,
                'status' => SignatureStatus::Permitted,
                'expiration' => now()->addYear(),
            ],
        );
    }
}
