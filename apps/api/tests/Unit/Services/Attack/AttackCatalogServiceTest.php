<?php

use App\Enums\Attack\AttackScanType;
use App\Models\Attack\Attack;
use App\Models\User\User;
use App\Services\Attack\AttackCatalogService;
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

test('catalogAttacksForDispatch returns the selected subset in catalog order', function () {
    $admin = User::factory()->admin()->create();

    $first = Attack::factory()->for($admin)->create();
    $second = Attack::factory()->for($admin)->create();
    Attack::factory()->for($admin)->create();

    $attacks = (new AttackCatalogService)->catalogAttacksForDispatch(
        AttackScanType::Dast,
        [$second->id, $first->id],
    );

    expect($attacks->pluck('id')->all())->toBe([$first->id, $second->id]);
});

test('catalogAttacksForDispatch treats duplicate ids as a single attack', function () {
    $admin = User::factory()->admin()->create();
    $attack = Attack::factory()->for($admin)->create();

    $attacks = (new AttackCatalogService)->catalogAttacksForDispatch(
        AttackScanType::Dast,
        [$attack->id, $attack->id],
    );

    expect($attacks)->toHaveCount(1)
        ->and($attacks->first()?->id)->toBe($attack->id);
});

test('catalogAttacksForDispatch throws when ids are empty', function () {
    $admin = User::factory()->admin()->create();
    Attack::factory()->for($admin)->create();

    (new AttackCatalogService)->catalogAttacksForDispatch(AttackScanType::Dast, []);
})->throws(RuntimeException::class, 'No catalog attacks are available for dispatch.');

test('catalogAttacksForDispatch throws when catalog is empty', function () {
    (new AttackCatalogService)->catalogAttacksForDispatch(
        AttackScanType::Dast,
        ['019e7121-0000-7000-8000-000000000001'],
    );
})->throws(RuntimeException::class, 'No catalog attacks are available for dispatch.');

test('catalogAttacksForDispatch throws when id belongs to another scan type', function () {
    $admin = User::factory()->admin()->create();
    Attack::factory()->for($admin)->create();
    $sastAttack = Attack::factory()->sast()->for($admin)->create();

    (new AttackCatalogService)->catalogAttacksForDispatch(
        AttackScanType::Dast,
        [$sastAttack->id],
    );
})->throws(RuntimeException::class, 'One or more selected attacks are not available for this scan.');

test('catalogAttacksForDispatch throws when id is not owned by a catalog manager', function () {
    $admin = User::factory()->admin()->create();
    $other = User::factory()->create();
    Attack::factory()->for($admin)->create();
    $privateAttack = Attack::factory()->for($other)->create();

    (new AttackCatalogService)->catalogAttacksForDispatch(
        AttackScanType::Dast,
        [$privateAttack->id],
    );
})->throws(RuntimeException::class, 'One or more selected attacks are not available for this scan.');
