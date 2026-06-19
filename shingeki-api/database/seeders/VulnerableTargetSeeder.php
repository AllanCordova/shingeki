<?php

namespace Database\Seeders;

use App\Enums\SignatureStatus;
use App\Models\Project;
use App\Models\Signature;
use App\Models\Stack;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class VulnerableTargetSeeder extends Seeder
{
    use WithoutModelEvents;

    public const PROJECT_NAME = 'Pentest Lab';

    public const SYSTEM_NAME = 'Vulnerable PHP Target';

    public function run(): void
    {
        $user = User::query()->where('email', 'test@example.com')->first();

        if ($user === null) {
            return;
        }

        $targetUrl = rtrim((string) config('attacks.vulnerable_target_url'), '/');
        $signatureToken = (string) config('attacks.vulnerable_target_signature_token');

        $project = Project::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'name' => self::PROJECT_NAME,
            ],
            [
                'description' => 'Local intentionally vulnerable app for DAST validation.',
                'cover_path' => '/storage/covers/pentest-lab.png',
            ],
        );

        $system = System::query()->updateOrCreate(
            [
                'project_id' => $project->id,
                'name' => self::SYSTEM_NAME,
            ],
            [
                'cover_path' => '/storage/covers/vulnerable-php-target.png',
                'target_url' => $targetUrl,
                'repository_url' => 'https://github.com/shingeki/vulnerable-target',
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
