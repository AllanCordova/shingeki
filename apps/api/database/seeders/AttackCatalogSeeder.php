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

        foreach (self::definitions() as $definition) {
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

    /**
     * @return list<array{
     *     scan_type: AttackScanType,
     *     category: AttackCategory,
     *     target_location: AttackTargetLocation,
     *     risk_level: AttackRiskLevel,
     *     payload: array<string, mixed>
     * }>
     */
    public static function definitions(): array
    {
        $dast = [];
        foreach (self::dastPacks() as $pack) {
            $values = $pack['values'];
            $dast[] = [
                'scan_type' => AttackScanType::Dast,
                'category' => $pack['category'],
                'target_location' => $pack['location'],
                'risk_level' => $pack['risk'],
                'payload' => [
                    'value' => $values[0],
                    'values' => $values,
                ],
            ];
        }

        $dast[] = [
            'scan_type' => AttackScanType::Sast,
            'category' => AttackCategory::SqlInjection,
            'target_location' => AttackTargetLocation::SourceCode,
            'risk_level' => AttackRiskLevel::High,
            'payload' => ['languages' => ['php', 'typescript', 'javascript']],
        ];

        return $dast;
    }

    /**
     * @return list<array{
     *     category: AttackCategory,
     *     location: AttackTargetLocation,
     *     risk: AttackRiskLevel,
     *     values: list<string>
     * }>
     */
    private static function dastPacks(): array
    {
        $sql = AttackCatalogPayloads::sql();
        $xss = AttackCatalogPayloads::xss();
        $cmd = AttackCatalogPayloads::command();
        $nosql = AttackCatalogPayloads::nosql();
        $ssti = AttackCatalogPayloads::ssti();
        $ldap = AttackCatalogPayloads::ldap();
        $ssrf = AttackCatalogPayloads::ssrf();

        return [
            ['category' => AttackCategory::SqlInjection, 'location' => AttackTargetLocation::Form, 'risk' => AttackRiskLevel::High, 'values' => $sql],
            ['category' => AttackCategory::SqlInjection, 'location' => AttackTargetLocation::JsonBody, 'risk' => AttackRiskLevel::High, 'values' => $sql],
            ['category' => AttackCategory::SqlInjection, 'location' => AttackTargetLocation::QueryParameter, 'risk' => AttackRiskLevel::High, 'values' => $sql],
            ['category' => AttackCategory::Xss, 'location' => AttackTargetLocation::QueryParameter, 'risk' => AttackRiskLevel::Medium, 'values' => $xss],
            ['category' => AttackCategory::Xss, 'location' => AttackTargetLocation::JsonBody, 'risk' => AttackRiskLevel::Medium, 'values' => $xss],
            ['category' => AttackCategory::Xss, 'location' => AttackTargetLocation::Form, 'risk' => AttackRiskLevel::Medium, 'values' => $xss],
            ['category' => AttackCategory::PathTraversal, 'location' => AttackTargetLocation::UrlPath, 'risk' => AttackRiskLevel::High, 'values' => AttackCatalogPayloads::path()],
            ['category' => AttackCategory::Idor, 'location' => AttackTargetLocation::UrlPath, 'risk' => AttackRiskLevel::High, 'values' => AttackCatalogPayloads::idorPath()],
            ['category' => AttackCategory::Idor, 'location' => AttackTargetLocation::JsonBody, 'risk' => AttackRiskLevel::High, 'values' => AttackCatalogPayloads::idorJson()],
            ['category' => AttackCategory::CommandInjection, 'location' => AttackTargetLocation::QueryParameter, 'risk' => AttackRiskLevel::High, 'values' => $cmd],
            ['category' => AttackCategory::CommandInjection, 'location' => AttackTargetLocation::JsonBody, 'risk' => AttackRiskLevel::High, 'values' => $cmd],
            ['category' => AttackCategory::CommandInjection, 'location' => AttackTargetLocation::Form, 'risk' => AttackRiskLevel::High, 'values' => $cmd],
            ['category' => AttackCategory::NosqlInjection, 'location' => AttackTargetLocation::JsonBody, 'risk' => AttackRiskLevel::High, 'values' => $nosql],
            ['category' => AttackCategory::NosqlInjection, 'location' => AttackTargetLocation::QueryParameter, 'risk' => AttackRiskLevel::High, 'values' => $nosql],
            ['category' => AttackCategory::Xxe, 'location' => AttackTargetLocation::FileUpload, 'risk' => AttackRiskLevel::High, 'values' => AttackCatalogPayloads::xxe()],
            ['category' => AttackCategory::Xxe, 'location' => AttackTargetLocation::JsonBody, 'risk' => AttackRiskLevel::High, 'values' => AttackCatalogPayloads::xxe()],
            ['category' => AttackCategory::Ssrf, 'location' => AttackTargetLocation::QueryParameter, 'risk' => AttackRiskLevel::High, 'values' => $ssrf],
            ['category' => AttackCategory::Ssrf, 'location' => AttackTargetLocation::JsonBody, 'risk' => AttackRiskLevel::High, 'values' => $ssrf],
            ['category' => AttackCategory::Ssrf, 'location' => AttackTargetLocation::Header, 'risk' => AttackRiskLevel::High, 'values' => $ssrf],
            ['category' => AttackCategory::LdapInjection, 'location' => AttackTargetLocation::QueryParameter, 'risk' => AttackRiskLevel::High, 'values' => $ldap],
            ['category' => AttackCategory::LdapInjection, 'location' => AttackTargetLocation::JsonBody, 'risk' => AttackRiskLevel::High, 'values' => $ldap],
            ['category' => AttackCategory::Csrf, 'location' => AttackTargetLocation::Form, 'risk' => AttackRiskLevel::Medium, 'values' => AttackCatalogPayloads::csrf()],
            ['category' => AttackCategory::OpenRedirect, 'location' => AttackTargetLocation::QueryParameter, 'risk' => AttackRiskLevel::Medium, 'values' => AttackCatalogPayloads::openRedirect()],
            ['category' => AttackCategory::Ssti, 'location' => AttackTargetLocation::QueryParameter, 'risk' => AttackRiskLevel::High, 'values' => $ssti],
            ['category' => AttackCategory::Ssti, 'location' => AttackTargetLocation::JsonBody, 'risk' => AttackRiskLevel::High, 'values' => $ssti],
            ['category' => AttackCategory::Ssti, 'location' => AttackTargetLocation::Form, 'risk' => AttackRiskLevel::High, 'values' => $ssti],
            ['category' => AttackCategory::JwtConfusion, 'location' => AttackTargetLocation::Header, 'risk' => AttackRiskLevel::High, 'values' => AttackCatalogPayloads::jwt()],
        ];
    }
}
