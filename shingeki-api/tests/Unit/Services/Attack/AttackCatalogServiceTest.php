<?php

use App\Enums\Scanning\AttackScanType;
use App\Models\Catalog\Attack;
use App\Models\Identity\User;
use App\Services\Catalog\AttackCatalogService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('catalogAttacks returns only attacks owned by catalog managers', function () {
    $admin = User::factory()->admin()->create();
    $specialist = User::factory()->specialist()->create();
    $other = User::factory()->create();

    $adminAttack = Attack::factory()->for($admin)->create();
    $specialistAttack = Attack::factory()->for($specialist)->create();
    Attack::factory()->for($other)->create();

    $attacks = (new AttackCatalogService)->catalogAttacks();

    expect($attacks)->toHaveCount(2)
        ->and($attacks->pluck('id')->all())->toEqualCanonicalizing([
            $adminAttack->id,
            $specialistAttack->id,
        ]);
});

test('catalogAttacks filters by scan type', function () {
    $admin = User::factory()->admin()->create();

    Attack::factory()->for($admin)->create();
    $sastAttack = Attack::factory()->sast()->for($admin)->create();

    $attacks = (new AttackCatalogService)->catalogAttacks(AttackScanType::Sast);

    expect($attacks)->toHaveCount(1)
        ->and($attacks->first()?->id)->toBe($sastAttack->id);
});

test('catalogAttacksOrFail throws when catalog is empty', function () {
    (new AttackCatalogService)->catalogAttacksOrFail();
})->throws(RuntimeException::class);
