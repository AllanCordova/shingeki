<?php

namespace Database\Seeders;

use App\Enums\Catalog\AttackCategory;
use App\Enums\Catalog\AttackRiskLevel;
use App\Enums\Catalog\AttackTargetLocation;
use App\Enums\Identity\UserRole;
use App\Enums\Scanning\AttackScanType;
use App\Models\Catalog\Attack;
use App\Models\Identity\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AttackCatalogSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * @var list<array{
     *     scan_type: AttackScanType,
     *     category: AttackCategory,
     *     target_location: AttackTargetLocation,
     *     risk_level: AttackRiskLevel,
     *     payload: array<string, mixed>
     * }>
     */
    private const CATALOG = [
        [
            'scan_type' => AttackScanType::Dast,
            'category' => AttackCategory::SqlInjection,
            'target_location' => AttackTargetLocation::Form,
            'risk_level' => AttackRiskLevel::High,
            'payload' => ['field' => 'email', 'value' => "' OR 1=1 --"],
        ],
        [
            'scan_type' => AttackScanType::Dast,
            'category' => AttackCategory::Xss,
            'target_location' => AttackTargetLocation::QueryParameter,
            'risk_level' => AttackRiskLevel::Medium,
            'payload' => ['parameter' => 'q', 'value' => '<script>alert(1)</script>'],
        ],
        [
            'scan_type' => AttackScanType::Dast,
            'category' => AttackCategory::PathTraversal,
            'target_location' => AttackTargetLocation::UrlPath,
            'risk_level' => AttackRiskLevel::High,
            'payload' => ['value' => '../storage/secret.txt'],
        ],
        [
            'scan_type' => AttackScanType::Sast,
            'category' => AttackCategory::SqlInjection,
            'target_location' => AttackTargetLocation::SourceCode,
            'risk_level' => AttackRiskLevel::High,
            'payload' => ['languages' => ['php', 'typescript', 'javascript']],
        ],
    ];

    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => config('attacks.catalog_admin_email')],
            [
                'name' => 'Catalog Owner',
                'password' => Hash::make(Str::password(48)),
                'role' => UserRole::Admin,
            ],
        );

        foreach (self::CATALOG as $definition) {
            $exists = Attack::query()
                ->where('user_id', $admin->id)
                ->where('scan_type', $definition['scan_type'])
                ->where('category', $definition['category'])
                ->where('target_location', $definition['target_location'])
                ->exists();

            if ($exists) {
                continue;
            }

            Attack::create([
                'user_id' => $admin->id,
                ...$definition,
            ]);
        }
    }
}
