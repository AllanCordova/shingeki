<?php

use App\Enums\Attack\AttackCategory;
use App\Enums\Attack\AttackScanType;
use App\Enums\Attack\AttackTargetLocation;
use App\Models\Attack\Attack;
use App\Models\User\User;
use Database\Seeders\AttackCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('attack catalog seeder creates generic dast payloads without field locks', function () {
    $this->seed(AttackCatalogSeeder::class);

    $admin = User::query()->where('email', config('attacks.catalog_admin_email'))->firstOrFail();

    $dast = Attack::query()
        ->where('user_id', $admin->id)
        ->where('scan_type', AttackScanType::Dast)
        ->get();

    expect($dast)->toHaveCount(6);

    $sqlJson = $dast->first(
        fn (Attack $attack) => $attack->category === AttackCategory::SqlInjection
            && $attack->target_location === AttackTargetLocation::JsonBody,
    );

    expect($sqlJson)->not->toBeNull()
        ->and($sqlJson->payload)->not->toHaveKey('field')
        ->and($sqlJson->payload['values'])->toContain("' OR 1=1 --")
        ->and($sqlJson->payload['values'])->toContain("' or 1=1--");

    $xssQuery = $dast->first(
        fn (Attack $attack) => $attack->category === AttackCategory::Xss
            && $attack->target_location === AttackTargetLocation::QueryParameter,
    );

    expect($xssQuery)->not->toBeNull()
        ->and($xssQuery->payload)->not->toHaveKey('parameter')
        ->and($xssQuery->payload['values'])->toContain('<script>alert(1)</script>');

    $path = $dast->first(
        fn (Attack $attack) => $attack->category === AttackCategory::PathTraversal,
    );

    expect($path)->not->toBeNull()
        ->and($path->payload['values'])->toContain('../storage/secret.txt')
        ->and($path->payload['values'])->toContain('../../etc/passwd');
});
