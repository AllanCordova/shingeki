<?php

use App\Enums\AttackScanType;
use App\Enums\SignatureStatus;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\Signature;
use App\Models\System;
use App\Models\User;
use App\Services\Attack\AttackQueuePublisher;
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

function validAttackDispatchPayload(): array
{
    return [];
}

describe('POST attacks/dispatch', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload())
            ->assertUnauthorized();
    });

    test('dispatches admin catalog attacks when signature is permitted', function () {
        config(['attacks.catalog_admin_email' => 'admin@admin.com']);

        $admin = User::factory()->create(['email' => 'admin@admin.com']);
        $catalogAttacks = Attack::factory()->count(2)->for($admin)->create();
        Attack::factory()->sast()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $token = str_repeat('c', 64);

        Signature::factory()->for($user)->for($system)->permitted()->create([
            'token' => $token,
        ]);

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
            ->assertJsonPath('dispatch.scan_type', 'DAST');

        expect(Attack::query()->where('user_id', $user->id)->count())->toBe(0)
            ->and(AttackDispatch::query()->where('system_id', $system->id)->count())->toBe(1)
            ->and(AttackDispatch::query()->where('system_id', $system->id)->first()?->scan_type)->toBe(AttackScanType::Dast);
    });

    test('returns unprocessable when catalog is empty', function () {
        config(['attacks.catalog_admin_email' => 'admin@admin.com']);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $token = str_repeat('f', 64);

        Signature::factory()->for($user)->for($system)->permitted()->create([
            'token' => $token,
        ]);

        Sanctum::actingAs($user);

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload())
            ->assertUnprocessable()
            ->assertJsonPath('message', 'No catalog attacks are available for dispatch.');
    });

    test('rejects dispatch when signature is denied', function () {
        config(['attacks.catalog_admin_email' => 'admin@admin.com']);

        $admin = User::factory()->create(['email' => 'admin@admin.com']);
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $token = str_repeat('d', 64);

        Signature::factory()->for($user)->for($system)->create([
            'token' => $token,
            'status' => SignatureStatus::Denied,
        ]);

        Sanctum::actingAs($user);

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload())
            ->assertForbidden()
            ->assertJsonPath('message', 'Signature token is not permitted for attacks.');
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

    test('rejects dispatch when system has no signature', function () {
        config(['attacks.catalog_admin_email' => 'admin@admin.com']);

        $admin = User::factory()->create(['email' => 'admin@admin.com']);
        Attack::factory()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload())
            ->assertForbidden()
            ->assertJsonPath('message', 'No signature token found for this system.');
    });
});

describe('POST attacks/dispatch/sast', function () {
    test('dispatches sast catalog attacks when signature is permitted', function () {
        config(['attacks.catalog_admin_email' => 'admin@admin.com']);

        $admin = User::factory()->create(['email' => 'admin@admin.com']);
        Attack::factory()->count(2)->for($admin)->create();
        $sastAttack = Attack::factory()->sast()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/org/repo',
        ]);
        $token = str_repeat('s', 64);

        Signature::factory()->for($user)->for($system)->permitted()->create([
            'token' => $token,
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
            );

        $response = $this->postJson(attackSastDispatchUrl($project, $system), validAttackDispatchPayload());

        $response
            ->assertAccepted()
            ->assertJson([
                'message' => 'SAST attack catalog dispatched to processing queue.',
                'attacks_count' => 1,
            ])
            ->assertJsonPath('dispatch.scan_type', 'SAST');
    });

    test('returns unprocessable when repository url is missing', function () {
        config(['attacks.catalog_admin_email' => 'admin@admin.com']);

        $admin = User::factory()->create(['email' => 'admin@admin.com']);
        Attack::factory()->sast()->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $system->update(['repository_url' => '']);
        $token = str_repeat('r', 64);

        Signature::factory()->for($user)->for($system)->permitted()->create([
            'token' => $token,
        ]);

        Sanctum::actingAs($user);

        $this->postJson(attackSastDispatchUrl($project, $system), validAttackDispatchPayload())
            ->assertUnprocessable()
            ->assertJsonPath('message', 'System repository_url is required for SAST dispatch.');
    });
});
