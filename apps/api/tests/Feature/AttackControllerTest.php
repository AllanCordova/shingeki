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

function validAttackDispatchPayload(): array
{
    return [
        'accepted_responsibility' => true,
        'accepted_legal_terms' => true,
        'terms_version' => AttackAcknowledgmentTerms::VERSION,
    ];
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

        $response = $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload());

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

    test('dispatches with quick depth when requested', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once();

        $this->postJson(attackDispatchUrl($project, $system), [
            ...validAttackDispatchPayload(),
            'depth' => 'quick',
        ])
            ->assertAccepted()
            ->assertJsonPath('dispatch.depth', 'quick');

        $dispatch = AttackDispatch::query()->where('system_id', $system->id)->first();

        expect($dispatch?->depth)->toBe(AttackDepth::Quick);
    });

    test('dispatches with start_path and max_routes scope', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once();

        $this->postJson(attackDispatchUrl($project, $system), [
            ...validAttackDispatchPayload(),
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
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once();

        $this->postJson(attackDispatchUrl($project, $system), [
            ...validAttackDispatchPayload(),
            'start_path' => '/products',
        ])
            ->assertAccepted()
            ->assertJsonPath('dispatch.start_path', '/products')
            ->assertJsonPath('dispatch.max_routes', null);
    });

    test('returns unprocessable for invalid depth', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(attackDispatchUrl($project, $system), [
            ...validAttackDispatchPayload(),
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

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload())
            ->assertUnprocessable()
            ->assertJsonPath('message', 'No catalog attacks are available for dispatch.');
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

        $response = $this->postJson(attackSastDispatchUrl($project, $system), validAttackDispatchPayload());

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
        Attack::factory()->sast()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $system->update(['repository_url' => '']);

        Sanctum::actingAs($user);

        $this->postJson(attackSastDispatchUrl($project, $system), validAttackDispatchPayload())
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
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->mock(AttackQueuePublisher::class)
            ->shouldReceive('publishDispatchBatch')
            ->once();

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload())
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
