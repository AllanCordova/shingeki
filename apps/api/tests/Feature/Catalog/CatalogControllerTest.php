<?php

use App\Enums\Attack\AttackCategory;
use App\Enums\Attack\AttackRiskLevel;
use App\Enums\Attack\AttackScanType;
use App\Enums\Attack\AttackTargetLocation;
use App\Enums\User\UserRole;
use App\Models\Attack\Attack;
use App\Models\Remediation\Remediation;
use App\Models\System\Stack;
use App\Models\User\User;
use Laravel\Sanctum\Sanctum;

const CATALOG_ATTACKS = '/api/catalog/attacks';
const CATALOG_REMEDIATIONS = '/api/catalog/remediations';

function actingAsSpecialist(): User
{
    $user = User::factory()->specialist()->create();
    Sanctum::actingAs($user);

    return $user;
}

function validCatalogAttackPayload(array $overrides = []): array
{
    return array_merge([
        'scan_type' => AttackScanType::Dast->value,
        'category' => AttackCategory::Xss->value,
        'target_location' => AttackTargetLocation::QueryParameter->value,
        'risk_level' => AttackRiskLevel::Medium->value,
        'payload' => ['parameter' => 'q', 'value' => '<script>alert(1)</script>'],
    ], $overrides);
}

function validCatalogRemediationPayload(Stack $stack, array $overrides = []): array
{
    return array_merge([
        'stack_id' => $stack->id,
        'scan_type' => AttackScanType::Dast->value,
        'attack_category' => AttackCategory::PathTraversal->value,
        'title' => 'Validar caminho com realpath',
        'description' => 'Garanta que o arquivo resolvido permanece no diretorio base.',
        'code_snippet' => '$resolved = realpath($path);',
        'references' => ['https://owasp.org/www-community/attacks/Path_Traversal'],
    ], $overrides);
}

describe('catalog access control', function () {
    test('regular user cannot list catalog attacks', function () {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson(CATALOG_ATTACKS)->assertForbidden();
    });

    test('specialist can list catalog attacks', function () {
        actingAsSpecialist();

        $this->getJson(CATALOG_ATTACKS)->assertOk();
    });
});

describe('POST /api/catalog/attacks', function () {
    test('specialist can create a catalog attack', function () {
        $user = actingAsSpecialist();

        $response = $this->postJson(CATALOG_ATTACKS, validCatalogAttackPayload());

        $response
            ->assertCreated()
            ->assertJsonPath('attack.user_id', $user->id)
            ->assertJsonPath('attack.category', AttackCategory::Xss->value);

        $this->assertDatabaseHas('attacks', [
            'user_id' => $user->id,
            'category' => AttackCategory::Xss->value,
        ]);
    });

    test('specialist cannot update another specialists attack', function () {
        $owner = User::factory()->specialist()->create();
        $other = actingAsSpecialist();
        $attack = Attack::factory()->create(['user_id' => $owner->id]);

        $this->putJson(CATALOG_ATTACKS.'/'.$attack->id, validCatalogAttackPayload())
            ->assertForbidden();

        expect($other->id)->not->toBe($owner->id);
    });

    test('specialist cannot delete another users catalog attack', function () {
        $owner = User::factory()->admin()->create();
        actingAsSpecialist();
        $attack = Attack::factory()->create(['user_id' => $owner->id]);

        $this->deleteJson(CATALOG_ATTACKS.'/'.$attack->id)->assertForbidden();

        $this->assertDatabaseHas('attacks', ['id' => $attack->id]);
    });

    test('specialist can delete own catalog attack', function () {
        $user = actingAsSpecialist();
        $attack = Attack::factory()->create(['user_id' => $user->id]);

        $this->deleteJson(CATALOG_ATTACKS.'/'.$attack->id)->assertOk();

        $this->assertDatabaseMissing('attacks', ['id' => $attack->id]);
    });

    test('admin can update another users catalog attack', function () {
        $owner = User::factory()->specialist()->create();
        Sanctum::actingAs(User::factory()->admin()->create());
        $attack = Attack::factory()->create(['user_id' => $owner->id]);

        $this->putJson(CATALOG_ATTACKS.'/'.$attack->id, validCatalogAttackPayload([
            'risk_level' => AttackRiskLevel::High->value,
        ]))->assertOk();

        $this->assertDatabaseHas('attacks', [
            'id' => $attack->id,
            'risk_level' => AttackRiskLevel::High->value,
        ]);
    });

    test('catalog attack list includes ownership permissions', function () {
        $owner = User::factory()->admin()->create();
        $viewer = actingAsSpecialist();
        $owned = Attack::factory()->create(['user_id' => $viewer->id]);
        $foreign = Attack::factory()->create(['user_id' => $owner->id]);

        $response = $this->getJson(CATALOG_ATTACKS)->assertOk();

        $attacks = collect($response->json('attacks'))->keyBy('id');

        expect($attacks[$owned->id]['permissions'])->toMatchArray([
            'update' => true,
            'delete' => true,
        ])->and($attacks[$foreign->id]['permissions'])->toMatchArray([
            'update' => false,
            'delete' => false,
        ]);
    });

    test('paginates catalog attacks and filters by owner', function () {
        $ownerA = User::factory()->specialist()->create();
        $ownerB = User::factory()->admin()->create();
        actingAsSpecialist();

        Attack::factory()->count(3)->create(['user_id' => $ownerA->id]);
        Attack::factory()->count(2)->create(['user_id' => $ownerB->id]);

        $this->getJson(CATALOG_ATTACKS.'?page=1&per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'attacks')
            ->assertJsonPath('pagination.current_page', 1)
            ->assertJsonPath('pagination.per_page', 2)
            ->assertJsonPath('pagination.total', 5)
            ->assertJsonPath('pagination.last_page', 3);

        $this->getJson(CATALOG_ATTACKS.'?user_id='.$ownerB->id)
            ->assertOk()
            ->assertJsonCount(2, 'attacks')
            ->assertJsonPath('pagination.total', 2);
    });
});

describe('POST /api/catalog/remediations', function () {
    test('specialist can create a catalog remediation', function () {
        $user = actingAsSpecialist();
        $stack = Stack::factory()->vanillaPhp()->create();

        $response = $this->postJson(
            CATALOG_REMEDIATIONS,
            validCatalogRemediationPayload($stack),
        );

        $response
            ->assertCreated()
            ->assertJsonPath('remediation.title', 'Validar caminho com realpath')
            ->assertJsonPath('remediation.user_id', $user->id);

        $this->assertDatabaseHas('remediations', [
            'stack_id' => $stack->id,
            'user_id' => $user->id,
            'title' => 'Validar caminho com realpath',
        ]);
    });

    test('specialist cannot delete another users catalog remediation', function () {
        $owner = User::factory()->admin()->create();
        actingAsSpecialist();
        $remediation = Remediation::factory()->create(['user_id' => $owner->id]);

        $this->deleteJson(CATALOG_REMEDIATIONS.'/'.$remediation->id)->assertForbidden();

        $this->assertDatabaseHas('remediations', ['id' => $remediation->id]);
    });

    test('specialist can delete own catalog remediation', function () {
        $user = actingAsSpecialist();
        $remediation = Remediation::factory()->create(['user_id' => $user->id]);

        $this->deleteJson(CATALOG_REMEDIATIONS.'/'.$remediation->id)->assertOk();

        $this->assertDatabaseMissing('remediations', ['id' => $remediation->id]);
    });

    test('admin can update another users catalog remediation', function () {
        $owner = User::factory()->specialist()->create();
        Sanctum::actingAs(User::factory()->admin()->create());
        $remediation = Remediation::factory()->create(['user_id' => $owner->id]);
        $stack = Stack::query()->findOrFail($remediation->stack_id);

        $this->putJson(
            CATALOG_REMEDIATIONS.'/'.$remediation->id,
            validCatalogRemediationPayload($stack, ['title' => 'Atualizado pelo admin']),
        )->assertOk();

        $this->assertDatabaseHas('remediations', [
            'id' => $remediation->id,
            'title' => 'Atualizado pelo admin',
        ]);
    });

    test('catalog remediation list includes ownership permissions', function () {
        $owner = User::factory()->admin()->create();
        $viewer = actingAsSpecialist();
        $stack = Stack::factory()->create();
        $owned = Remediation::factory()->create([
            'user_id' => $viewer->id,
            'stack_id' => $stack->id,
        ]);
        $foreign = Remediation::factory()->create([
            'user_id' => $owner->id,
            'stack_id' => $stack->id,
        ]);

        $response = $this->getJson(CATALOG_REMEDIATIONS)->assertOk();

        $remediations = collect($response->json('remediations'))->keyBy('id');

        expect($remediations[$owned->id]['permissions'])->toMatchArray([
            'update' => true,
            'delete' => true,
        ])->and($remediations[$foreign->id]['permissions'])->toMatchArray([
            'update' => false,
            'delete' => false,
        ]);
    });

    test('paginates catalog remediations and filters by owner', function () {
        $ownerA = User::factory()->specialist()->create();
        $ownerB = User::factory()->admin()->create();
        $stack = Stack::factory()->create();
        actingAsSpecialist();

        Remediation::factory()->count(3)->create([
            'user_id' => $ownerA->id,
            'stack_id' => $stack->id,
        ]);
        Remediation::factory()->count(2)->create([
            'user_id' => $ownerB->id,
            'stack_id' => $stack->id,
        ]);

        $this->getJson(CATALOG_REMEDIATIONS.'?page=1&per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'remediations')
            ->assertJsonPath('pagination.current_page', 1)
            ->assertJsonPath('pagination.per_page', 2)
            ->assertJsonPath('pagination.total', 5)
            ->assertJsonPath('pagination.last_page', 3);

        $this->getJson(CATALOG_REMEDIATIONS.'?user_id='.$ownerB->id)
            ->assertOk()
            ->assertJsonCount(2, 'remediations')
            ->assertJsonPath('pagination.total', 2);
    });
});

describe('user roles migration values', function () {
    test('factory stores uppercase role values', function () {
        $user = User::factory()->specialist()->create();

        expect($user->role)->toBe(UserRole::Specialist)
            ->and($user->role->value)->toBe('SPECIALIST');
    });
});
