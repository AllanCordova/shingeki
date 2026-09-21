<?php

use App\Enums\Attack\AttackDepth;
use App\Enums\Attack\AttackScanType;
use App\Models\Attack\Attack;
use App\Models\Attack\AttackAcknowledgment;
use App\Models\Attack\AttackDispatch;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;
use App\Services\Attack\AttackQueuePublisher;
use App\Support\AttackAcknowledgmentTerms;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

function attackDispatchUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/attacks/dispatch';
}

function attackSastDispatchUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/attacks/dispatch/sast';
}

function attackAcknowledgmentUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/attack-acknowledgment';
}

function attackCatalogUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/attacks/catalog';
}

/**
 * @param  list<string>  $attackIds
 * @return array<string, mixed>
 */
function validAttackDispatchPayload(array $attackIds = []): array
{
    $payload = [
        'accepted_responsibility' => true,
        'accepted_legal_terms' => true,
        'terms_version' => AttackAcknowledgmentTerms::VERSION,
    ];

    if ($attackIds !== []) {
        $payload['attack_ids'] = $attackIds;
    }

    return $payload;
}

describe('POST attacks/dispatch', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload())
            ->assertUnauthorized();
    });

    test('dispatches admin catalog attacks when acknowledgment is accepted', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $catalogAttacks = Attack::factory()->count(2)->for($admin)->create();
        Attack::factory()->sast()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once()
            ->with(
                Mockery::type(AttackDispatch::class),
                Mockery::on(fn (System $queuedSystem) => $queuedSystem->is($system)),
                Mockery::on(fn (User $queuedUser) => $queuedUser->is($user)),
                Mockery::on(fn (Collection $attacks) => $attacks->pluck('id')->all() === $catalogAttacks->pluck('id')->all()),
                AttackScanType::Dast,
                null,
            );

        $response = $this->postJson(
            attackDispatchUrl($project, $system),
            validAttackDispatchPayload($catalogAttacks->pluck('id')->all()),
        );

        $response
            ->assertAccepted()
            ->assertJson([
                'message' => 'DAST attack catalog dispatched to processing queue.',
                'attacks_count' => 2,
            ])
            ->assertJsonStructure([
                'dispatch' => ['id', 'system_id', 'user_id', 'scan_type', 'attacks_count', 'dispatched_at'],
                'attacks' => [
                    ['id', 'scan_type', 'category', 'target_location', 'risk_level', 'payload'],
                ],
            ])
            ->assertJsonPath('dispatch.scan_type', 'DAST')
            ->assertJsonPath('dispatch.depth', 'full');

        $dispatch = AttackDispatch::query()->where('system_id', $system->id)->first();

        expect(Attack::query()->where('user_id', $user->id)->count())->toBe(0)
            ->and(AttackDispatch::query()->where('system_id', $system->id)->count())->toBe(1)
            ->and($dispatch?->scan_type)->toBe(AttackScanType::Dast)
            ->and($dispatch?->depth)->toBe(AttackDepth::Full);

        $acknowledgment = AttackAcknowledgment::query()
            ->where('attack_dispatch_id', $dispatch->id)
            ->first();

        expect($acknowledgment)->not->toBeNull()
            ->and($acknowledgment->user_id)->toBe($user->id)
            ->and($acknowledgment->project_id)->toBe($project->id)
            ->and($acknowledgment->system_id)->toBe($system->id)
            ->and($acknowledgment->accepted_responsibility)->toBeTrue()
            ->and($acknowledgment->accepted_legal_terms)->toBeTrue()
            ->and($acknowledgment->terms_version)->toBe(AttackAcknowledgmentTerms::VERSION);
    });

    test('publishes scanner credentials instead of a copied target session', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $catalogAttacks = Attack::factory()->count(1)->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'login_url' => 'https://app.example.com/login',
            'login_username' => 'scanner@example.com',
            'login_password' => 'secret-pass-123',
        ]);

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once()
            ->with(
                Mockery::type(AttackDispatch::class),
                Mockery::on(fn (System $queuedSystem) => $queuedSystem->is($system)),
                Mockery::on(fn (User $queuedUser) => $queuedUser->is($user)),
                Mockery::on(fn (Collection $attacks) => $attacks->count() === 1),
                AttackScanType::Dast,
                Mockery::on(fn (?array $auth) => $auth === [
                    'type' => 'credentials',
                    'username' => 'scanner@example.com',
                    'password' => 'secret-pass-123',
                    'login_url' => 'https://app.example.com/login',
                ]),
            );

        $this->postJson(
            attackDispatchUrl($project, $system),
            validAttackDispatchPayload($catalogAttacks->pluck('id')->all()),
        )
            ->assertAccepted()
            ->assertJsonPath('scanner_login_configured', true)
            ->assertJsonMissingPath('target_session_connected');
    });

    test('dispatches with quick depth when requested', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $attack = Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once();

        $this->postJson(attackDispatchUrl($project, $system), [
            ...validAttackDispatchPayload([$attack->id]),
            'depth' => 'quick',
        ])
            ->assertAccepted()
            ->assertJsonPath('dispatch.depth', 'quick');

        $dispatch = AttackDispatch::query()->where('system_id', $system->id)->first();

        expect($dispatch?->depth)->toBe(AttackDepth::Quick);
    });

    test('dispatches with start_path and max_routes scope', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $attack = Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once();

        $this->postJson(attackDispatchUrl($project, $system), [
            ...validAttackDispatchPayload([$attack->id]),
            'depth' => 'quick',
            'start_path' => 'products',
            'max_routes' => 50,
        ])
            ->assertAccepted()
            ->assertJsonPath('dispatch.depth', 'quick')
            ->assertJsonPath('dispatch.start_path', '/products')
            ->assertJsonPath('dispatch.max_routes', 50);

        $dispatch = AttackDispatch::query()->where('system_id', $system->id)->first();

        expect($dispatch?->start_path)->toBe('/products')
            ->and($dispatch?->max_routes)->toBe(50);
    });

    test('omits max_routes when start_path is set without max_routes', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $attack = Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once();

        $this->postJson(attackDispatchUrl($project, $system), [
            ...validAttackDispatchPayload([$attack->id]),
            'start_path' => '/products',
        ])
            ->assertAccepted()
            ->assertJsonPath('dispatch.start_path', '/products')
            ->assertJsonPath('dispatch.max_routes', null);
    });

    test('returns unprocessable for invalid depth', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $attack = Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(attackDispatchUrl($project, $system), [
            ...validAttackDispatchPayload([$attack->id]),
            'depth' => 'deep',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['depth']);
    });

    test('returns unprocessable when acknowledgment is missing', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(attackDispatchUrl($project, $system), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'accepted_responsibility',
                'accepted_legal_terms',
                'terms_version',
            ]);
    });

    test('returns unprocessable when catalog is empty', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(
            attackDispatchUrl($project, $system),
            validAttackDispatchPayload(),
        )
            ->assertUnprocessable()
            ->assertJsonPath('message', 'No catalog attacks are available for dispatch.');
    });

    test('dispatches the full catalog when attack_ids is omitted', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $catalogAttacks = Attack::factory()->count(2)->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once()
            ->with(
                Mockery::type(AttackDispatch::class),
                Mockery::on(fn (System $queuedSystem) => $queuedSystem->is($system)),
                Mockery::on(fn (User $queuedUser) => $queuedUser->is($user)),
                Mockery::on(fn (Collection $attacks) => $attacks->pluck('id')->all() === $catalogAttacks->pluck('id')->all()),
                AttackScanType::Dast,
                null,
            );

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload())
            ->assertAccepted()
            ->assertJsonPath('attacks_count', 2);
    });

    test('dispatches only the selected catalog attacks', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $selected = Attack::factory()->for($admin)->create();
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once()
            ->with(
                Mockery::type(AttackDispatch::class),
                Mockery::on(fn (System $queuedSystem) => $queuedSystem->is($system)),
                Mockery::on(fn (User $queuedUser) => $queuedUser->is($user)),
                Mockery::on(fn (Collection $attacks) => $attacks->pluck('id')->all() === [$selected->id]),
                AttackScanType::Dast,
                null,
            );

        $this->postJson(
            attackDispatchUrl($project, $system),
            validAttackDispatchPayload([$selected->id]),
        )
            ->assertAccepted()
            ->assertJsonPath('attacks_count', 1);
    });

    test('returns unprocessable when attack_ids are not in the catalog', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(
            attackDispatchUrl($project, $system),
            validAttackDispatchPayload([(string) Str::uuid()]),
        )
            ->assertUnprocessable()
            ->assertJsonPath('message', 'One or more selected attacks are not available for this scan.');
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($intruder);

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload())
            ->assertNotFound();
    });
});

describe('POST attacks/dispatch/sast', function () {
    test('dispatches sast catalog attacks when acknowledgment is accepted', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        Attack::factory()->count(2)->for($admin)->create();
        $sastAttack = Attack::factory()->sast()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/org/repo',
        ]);

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once()
            ->with(
                Mockery::type(AttackDispatch::class),
                Mockery::on(fn (System $queuedSystem) => $queuedSystem->is($system)),
                Mockery::on(fn (User $queuedUser) => $queuedUser->is($user)),
                Mockery::on(fn (Collection $attacks) => $attacks->pluck('id')->all() === [$sastAttack->id]),
                AttackScanType::Sast,
                null,
            );

        $response = $this->postJson(
            attackSastDispatchUrl($project, $system),
            validAttackDispatchPayload([$sastAttack->id]),
        );

        $response
            ->assertAccepted()
            ->assertJson([
                'message' => 'SAST attack catalog dispatched to processing queue.',
                'attacks_count' => 1,
            ])
            ->assertJsonPath('dispatch.scan_type', 'SAST')
            ->assertJsonPath('dispatch.depth', 'full');

        expect(AttackAcknowledgment::query()->where('system_id', $system->id)->count())->toBe(1);
    });

    test('returns unprocessable when repository url is missing', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $sastAttack = Attack::factory()->sast()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $system->update(['repository_url' => '']);

        Sanctum::actingAs($user);

        $this->postJson(
            attackSastDispatchUrl($project, $system),
            validAttackDispatchPayload([$sastAttack->id]),
        )
            ->assertUnprocessable()
            ->assertJsonPath('message', 'System repository_url is required for SAST dispatch.');
    });
});

describe('GET attack-acknowledgment', function () {
    test('returns not acknowledged before first dispatch', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->getJson(attackAcknowledgmentUrl($project, $system))
            ->assertOk()
            ->assertJsonPath('acknowledged', false)
            ->assertJsonPath('terms.version', AttackAcknowledgmentTerms::VERSION)
            ->assertJsonPath('terms.responsibility_code', AttackAcknowledgmentTerms::RESPONSIBILITY_CODE);
    });

    test('returns acknowledged after dispatch with current terms', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $attack = Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once();

        $this->postJson(
            attackDispatchUrl($project, $system),
            validAttackDispatchPayload([$attack->id]),
        )
            ->assertAccepted();

        $this->getJson(attackAcknowledgmentUrl($project, $system))
            ->assertOk()
            ->assertJsonPath('acknowledged', true);

        expect($this->getJson(attackAcknowledgmentUrl($project, $system))->json('acknowledged_at'))
            ->not->toBeNull();
    });

    test('returns not acknowledged when only outdated terms exist', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

        AttackAcknowledgment::query()->create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'system_id' => $system->id,
            'attack_dispatch_id' => $dispatch->id,
            'accepted_responsibility' => true,
            'accepted_legal_terms' => true,
            'terms_version' => '2000-01-01',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'pest',
            'acknowledged_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->getJson(attackAcknowledgmentUrl($project, $system))
            ->assertOk()
            ->assertJsonPath('acknowledged', false);
    });
});

describe('GET attacks/catalog', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $this->getJson(attackCatalogUrl($project, $system))
            ->assertUnauthorized();
    });

    test('returns slim catalog attacks for the requested scan type', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $dastAttack = Attack::factory()->for($admin)->create();
        Attack::factory()->sast()->for($admin)->create();
        Attack::factory()->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->getJson(attackCatalogUrl($project, $system).'?scan_type=DAST')
            ->assertOk()
            ->assertJsonCount(1, 'attacks')
            ->assertJsonPath('attacks.0.id', $dastAttack->id)
            ->assertJsonPath('attacks.0.scan_type', 'DAST')
            ->assertJsonPath('attacks.0.category', $dastAttack->category->value)
            ->assertJsonPath('attacks.0.target_location', $dastAttack->target_location->value)
            ->assertJsonPath('attacks.0.risk_level', $dastAttack->risk_level->value)
            ->assertJsonMissingPath('attacks.0.payload')
            ->assertJsonMissingPath('attacks.0.user_id');
    });

    test('defaults to DAST when scan_type is omitted', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        $dastAttack = Attack::factory()->for($admin)->create();
        Attack::factory()->sast()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->getJson(attackCatalogUrl($project, $system))
            ->assertOk()
            ->assertJsonCount(1, 'attacks')
            ->assertJsonPath('attacks.0.id', $dastAttack->id);
    });

    test('filters catalog attacks by SAST scan type', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        Attack::factory()->for($admin)->create();
        $sastAttack = Attack::factory()->sast()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->getJson(attackCatalogUrl($project, $system).'?scan_type=SAST')
            ->assertOk()
            ->assertJsonCount(1, 'attacks')
            ->assertJsonPath('attacks.0.id', $sastAttack->id)
            ->assertJsonPath('attacks.0.scan_type', 'SAST');
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($intruder);

        $this->getJson(attackCatalogUrl($project, $system))
            ->assertNotFound();
    });
});
