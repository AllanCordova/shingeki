<?php

use App\Enums\SignatureStatus;
use App\Models\Attack;
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

function validAttackDispatchPayload(string $signatureToken): array
{
    return ['signature_token' => $signatureToken];
}

describe('POST attacks/dispatch', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload(str_repeat('a', 64)))
            ->assertUnauthorized();
    });

    test('dispatches admin catalog attacks when signature is permitted', function () {
        config(['attacks.catalog_admin_email' => 'admin@admin.com']);

        $admin = User::factory()->create(['email' => 'admin@admin.com']);
        $catalogAttacks = Attack::factory()->count(2)->for($admin)->create();

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
            ->withArgs(function (System $queuedSystem, User $queuedUser, Collection $attacks) use ($system, $user, $catalogAttacks) {
                return $queuedSystem->is($system)
                    && $queuedUser->is($user)
                    && $attacks->pluck('id')->all() === $catalogAttacks->pluck('id')->all();
            });

        $response = $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload($token));

        $response
            ->assertAccepted()
            ->assertJson([
                'message' => 'Attack catalog dispatched to processing queue.',
                'attacks_count' => 2,
            ])
            ->assertJsonStructure([
                'attacks' => [
                    ['id', 'category', 'target_location', 'risk_level', 'payload'],
                ],
            ]);

        expect(Attack::query()->where('user_id', $user->id)->count())->toBe(0);
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

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload($token))
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

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload($token))
            ->assertForbidden()
            ->assertJsonPath('message', 'Signature token is not permitted for attacks.');
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($intruder);

        $this->postJson(attackDispatchUrl($project, $system), validAttackDispatchPayload(str_repeat('e', 64)))
            ->assertNotFound();
    });
});
