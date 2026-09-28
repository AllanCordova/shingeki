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

    expect($dast)->toHaveCount(29);

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
        AttackCategory::SecretLeak->value,
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

    $secret = $dast->first(
        fn (Attack $attack) => $attack->category === AttackCategory::SecretLeak,
    );

    expect($secret)->not->toBeNull()
        ->and($secret->target_location)->toBe(AttackTargetLocation::ApiEndpoint)
        ->and($secret->payload['values'])->toEqual(AttackCatalogPayloads::secretLeak());

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

    $csrfHeader = $dast->first(
        fn (Attack $attack) => $attack->category === AttackCategory::Csrf
            && $attack->target_location === AttackTargetLocation::Header,
    );

    expect($csrfHeader)->not->toBeNull()
        ->and($csrfHeader->payload['field'])->toBe('Origin')
        ->and($csrfHeader->payload['values'])->toEqual(AttackCatalogPayloads::csrfOrigin());
});

test('attack catalog seeder creates a sast source-code attack per category', function () {
    $this->seed(AttackCatalogSeeder::class);

    $admin = User::query()->where('email', config('attacks.catalog_admin_email'))->firstOrFail();

    $sast = Attack::query()
        ->where('user_id', $admin->id)
        ->where('scan_type', AttackScanType::Sast)
        ->get();

    expect($sast)->toHaveCount(15);

    $categories = $sast->pluck('category')->map(fn ($c) => $c->value)->unique()->sort()->values();
    expect($categories->all())->toEqualCanonicalizing([
        AttackCategory::SqlInjection->value,
        AttackCategory::Xss->value,
        AttackCategory::PathTraversal->value,
        AttackCategory::CommandInjection->value,
        AttackCategory::Ssrf->value,
        AttackCategory::Xxe->value,
        AttackCategory::Ssti->value,
        AttackCategory::OpenRedirect->value,
        AttackCategory::NosqlInjection->value,
        AttackCategory::LdapInjection->value,
        AttackCategory::JwtConfusion->value,
        AttackCategory::Csrf->value,
        AttackCategory::Idor->value,
        AttackCategory::SupplyChain->value,
        AttackCategory::SecretLeak->value,
    ]);

    foreach ($sast as $attack) {
        expect($attack->target_location)->toBe(AttackTargetLocation::SourceCode)
            ->and($attack->payload['languages'])->toEqual(AttackCatalogSeeder::sastLanguages());
    }
});
