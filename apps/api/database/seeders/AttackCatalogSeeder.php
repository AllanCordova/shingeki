<?php

namespace Database\Seeders;

use App\Enums\Attack\AttackCategory;
use App\Enums\Attack\AttackRiskLevel;
use App\Enums\Attack\AttackScanType;
use App\Enums\Attack\AttackTargetLocation;
use App\Enums\User\UserRole;
use App\Models\Attack\Attack;
use App\Models\User\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AttackCatalogSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Generic SQLi variants: lab form login, Juice Shop JSON login, and REST search.
     *
     * @var list<string>
     */
    private const SQL_VALUES = [
        "' OR 1=1 --",
        "' or 1=1--",
        "')) OR 1=1--",
    ];

    /**
     * @var list<string>
     */
    private const XSS_VALUES = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
    ];

    /**
     * Lab path plus generic LFI. No field lock — mapper iterates vector params.
     *
     * @var list<string>
     */
    private const PATH_VALUES = [
        '../storage/secret.txt',
        'secret.txt',
        '../../etc/passwd',
        '....//....//etc/passwd',
    ];

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
            'payload' => [
                'value' => "' OR 1=1 --",
                'values' => self::SQL_VALUES,
            ],
        ],
        [
            'scan_type' => AttackScanType::Dast,
            'category' => AttackCategory::SqlInjection,
            'target_location' => AttackTargetLocation::JsonBody,
            'risk_level' => AttackRiskLevel::High,
            'payload' => [
                'value' => "' OR 1=1 --",
                'values' => self::SQL_VALUES,
            ],
        ],
        [
            'scan_type' => AttackScanType::Dast,
            'category' => AttackCategory::SqlInjection,
            'target_location' => AttackTargetLocation::QueryParameter,
            'risk_level' => AttackRiskLevel::High,
            'payload' => [
                'value' => "' OR 1=1 --",
                'values' => self::SQL_VALUES,
            ],
        ],
        [
            'scan_type' => AttackScanType::Dast,
            'category' => AttackCategory::Xss,
            'target_location' => AttackTargetLocation::QueryParameter,
            'risk_level' => AttackRiskLevel::Medium,
            'payload' => [
                'value' => '<script>alert(1)</script>',
                'values' => self::XSS_VALUES,
            ],
        ],
        [
            'scan_type' => AttackScanType::Dast,
            'category' => AttackCategory::Xss,
            'target_location' => AttackTargetLocation::JsonBody,
            'risk_level' => AttackRiskLevel::Medium,
            'payload' => [
                'value' => '<script>alert(1)</script>',
                'values' => self::XSS_VALUES,
            ],
        ],
        [
            'scan_type' => AttackScanType::Dast,
            'category' => AttackCategory::PathTraversal,
            'target_location' => AttackTargetLocation::UrlPath,
            'risk_level' => AttackRiskLevel::High,
            'payload' => [
                'value' => '../storage/secret.txt',
                'values' => self::PATH_VALUES,
            ],
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
                'name' => 'Attack Catalog Admin',
                'password' => Hash::make('password'),
                'role' => UserRole::Admin,
            ],
        );

        foreach (self::CATALOG as $definition) {
            Attack::query()->updateOrCreate(
                [
                    'user_id' => $admin->id,
                    'scan_type' => $definition['scan_type'],
                    'category' => $definition['category'],
                    'target_location' => $definition['target_location'],
                ],
                [
                    'risk_level' => $definition['risk_level'],
                    'payload' => $definition['payload'],
                ],
            );
        }
    }
}
