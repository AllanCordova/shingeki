<?php

use App\Enums\Attack\AttackCategory;
use App\Enums\Attack\AttackScanType;
use App\Enums\Attack\AttackTargetLocation;
use App\Models\Attack\Attack;
use App\Models\User\User;
use Database\Seeders\AttackCatalogPayloads;
use Database\Seeders\AttackCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('attack catalog seeder creates generic dast payloads for every category', function () {
    $this->seed(AttackCatalogSeeder::class);

    $admin = User::query()->where('email', config('attacks.catalog_admin_email'))->firstOrFail();

    $dast = Attack::query()
        ->where('user_id', $admin->id)
        ->where('scan_type', AttackScanType::Dast)
        ->get();

    expect($dast)->toHaveCount(27);

    $categories = $dast->pluck('category')->map(fn ($c) => $c->value)->unique()->sort()->values();
    expect($categories->all())->toEqualCanonicalizing([
        AttackCategory::SqlInjection->value,
        AttackCategory::Xss->value,
        AttackCategory::PathTraversal->value,
        AttackCategory::Idor->value,
        AttackCategory::CommandInjection->value,
        AttackCategory::NosqlInjection->value,
        AttackCategory::Xxe->value,
        AttackCategory::Ssrf->value,
        AttackCategory::LdapInjection->value,
        AttackCategory::Csrf->value,
        AttackCategory::OpenRedirect->value,
        AttackCategory::Ssti->value,
        AttackCategory::JwtConfusion->value,
    ]);

    $sqlJson = $dast->first(
        fn (Attack $attack) => $attack->category === AttackCategory::SqlInjection
            && $attack->target_location === AttackTargetLocation::JsonBody,
    );

    expect($sqlJson)->not->toBeNull()
        ->and($sqlJson->payload)->not->toHaveKey('field')
        ->and($sqlJson->payload['values'])->toContain("' OR 1=1 --")
        ->and($sqlJson->payload['values'])->toEqual(AttackCatalogPayloads::sql());

    $xssQuery = $dast->first(
        fn (Attack $attack) => $attack->category === AttackCategory::Xss
            && $attack->target_location === AttackTargetLocation::QueryParameter,
    );

    expect($xssQuery)->not->toBeNull()
        ->and($xssQuery->payload)->not->toHaveKey('parameter')
        ->and($xssQuery->payload['values'])->toContain('<iframe src="javascript:alert(`xss`)">');

    $jwt = $dast->first(
        fn (Attack $attack) => $attack->category === AttackCategory::JwtConfusion,
    );

    expect($jwt)->not->toBeNull()
        ->and($jwt->target_location)->toBe(AttackTargetLocation::Header)
        ->and($jwt->payload['values'])->toContain('none');

    $path = $dast->first(
        fn (Attack $attack) => $attack->category === AttackCategory::PathTraversal
            && $attack->target_location === AttackTargetLocation::UrlPath,
    );

    expect($path)->not->toBeNull()
        ->and($path->payload['values'])->toEqual(AttackCatalogPayloads::path())
        ->and($path->payload['values'])->toContain('acquisitions.md');

    $redirect = $dast->first(
        fn (Attack $attack) => $attack->category === AttackCategory::OpenRedirect,
    );

    expect($redirect)->not->toBeNull()
        ->and($redirect->payload['values'])->toContain('https://github.com/juice-shop/juice-shop.evil.invalid');
});
