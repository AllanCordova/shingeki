<?php

use App\Enums\AttackScanType;
use App\Models\Attack;
use App\Models\User;
use App\Services\Attack\AttackCatalogService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('catalogAttacks returns only attacks owned by catalog admin', function () {
    config(['attacks.catalog_admin_email' => 'admin@admin.com']);

    $admin = User::factory()->create(['email' => 'admin@admin.com']);
    $other = User::factory()->create(['email' => 'user@example.com']);

    $catalogAttack = Attack::factory()->for($admin)->create();
    Attack::factory()->for($other)->create();

    $attacks = (new AttackCatalogService)->catalogAttacks();

    expect($attacks)->toHaveCount(1)
        ->and($attacks->first()?->id)->toBe($catalogAttack->id);
});

test('catalogAttacks filters by scan type', function () {
    config(['attacks.catalog_admin_email' => 'admin@admin.com']);

    $admin = User::factory()->create(['email' => 'admin@admin.com']);

    Attack::factory()->for($admin)->create();
    $sastAttack = Attack::factory()->sast()->for($admin)->create();

    $attacks = (new AttackCatalogService)->catalogAttacks(AttackScanType::Sast);

    expect($attacks)->toHaveCount(1)
        ->and($attacks->first()?->id)->toBe($sastAttack->id);
});

test('catalogAttacksOrFail throws when catalog is empty', function () {
    config(['attacks.catalog_admin_email' => 'admin@admin.com']);

    (new AttackCatalogService)->catalogAttacksOrFail();
})->throws(RuntimeException::class);
