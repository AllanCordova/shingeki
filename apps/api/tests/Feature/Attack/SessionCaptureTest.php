<?php

use App\Models\Attack\Attack;
use App\Models\Attack\AttackDispatch;
use App\Models\Attack\BrowserCaptureSession;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;
use App\Services\Attack\AttackQueuePublisher;
use App\Support\AttackAcknowledgmentTerms;
use App\Support\BrowserStateCipher;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

function sessionCaptureUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/attacks/session-captures';
}

/**
 * @return array<string, mixed>
 */
function sessionCapturePayload(string $attackId): array
{
    return [
        'accepted_responsibility' => true,
        'accepted_legal_terms' => true,
        'terms_version' => AttackAcknowledgmentTerms::VERSION,
        'attack_ids' => [$attackId],
        'depth' => 'quick',
        'route_map' => [
            ['method' => 'GET', 'path' => '/conta'],
        ],
    ];
}

test('encrypts captured browser state before saving or queueing it', function () {
    $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
    $attack = Attack::factory()->for($admin)->create();
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create();
    $system = System::factory()->for($project)->create([
        'target_url' => 'https://alvo.example',
        'login_url' => 'https://alvo.example/login',
    ]);

    Sanctum::actingAs($user);

    $created = $this->postJson(sessionCaptureUrl($project, $system), sessionCapturePayload($attack->id))
        ->assertCreated()
        ->assertJsonPath('capture.status', 'pending');

    $token = $created->json('token');
    expect($token)->toBeString()->and(strlen($token))->toBe(64)
        ->and($created->json('command'))->toBeNull()
        ->and($created->json('capture.login_url'))->toBe('https://alvo.example');

    $secret = 'session-secret-xyz123';
    $published = null;
    $this->mock(AttackQueuePublisher::class)
        ->shouldReceive('publishDispatchBatch')
        ->once()
        ->withArgs(function (...$args) use (&$published) {
            $published = $args[5] ?? null;

            return true;
        });

    $this->postJson('/api/session-captures/'.$token.'/complete', [
        'cookies' => [[
            'name' => 'session_id',
            'value' => $secret,
            'domain' => 'alvo.example',
            'path' => '/',
            'expires' => 1735689600,
            'httpOnly' => true,
            'secure' => true,
            'sameSite' => 'Lax',
        ]],
        'origins' => [[
            'origin' => 'https://alvo.example',
            'localStorage' => [
                ['name' => 'auth_token', 'value' => $secret],
            ],
        ]],
    ])->assertAccepted();

    $dispatch = AttackDispatch::query()->where('system_id', $system->id)->first();
    $stored = json_encode($dispatch?->browser_state);

    expect($dispatch)->not->toBeNull()
        ->and($dispatch->scan_type->value)->toBe('DAST')
        ->and($dispatch->route_map[0]['path'] ?? null)->toBe('/conta')
        ->and($stored)->not->toContain($secret)
        ->and($published['type'] ?? null)->toBe('browser_state')
        ->and(json_encode($published))->not->toContain($secret);

    $this->postJson('/api/session-captures/'.$token.'/complete', [
        'cookies' => [['name' => 'session_id', 'value' => $secret]],
    ])->assertStatus(410);

    expect(BrowserCaptureSession::query()->where('attack_dispatch_id', $dispatch->id)->count())->toBe(1);
});

test('rejects an empty captured session and a reused capture stays pending', function () {
    $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
    $attack = Attack::factory()->for($admin)->create();
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create();
    $system = System::factory()->for($project)->create();

    Sanctum::actingAs($user);

    $token = $this->postJson(sessionCaptureUrl($project, $system), sessionCapturePayload($attack->id))
        ->assertCreated()
        ->json('token');

    $this->postJson('/api/session-captures/'.$token.'/complete', [
        'cookies' => [],
        'origins' => [],
    ])->assertUnprocessable();

    expect(AttackDispatch::query()->where('system_id', $system->id)->count())->toBe(0);
});

test('remote capture opens the system url and ignores a stored login page', function () {
    config([
        'browser_state.capture_service_url' => 'http://capture.test',
        'browser_state.capture_service_token' => 'capture-token',
        'browser_state.novnc_public_url' => 'http://127.0.0.1:6080/vnc.html?autoconnect=1&resize=scale',
        'browser_state.complete_base_url' => 'http://host.containers.internal:8000',
    ]);

    $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
    $attack = Attack::factory()->for($admin)->create();
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create();
    $system = System::factory()->for($project)->create([
        'target_url' => 'https://alvo.example',
        'login_url' => 'https://alvo.example/login',
    ]);

    Sanctum::actingAs($user);

    $created = $this->postJson(sessionCaptureUrl($project, $system), sessionCapturePayload($attack->id))
        ->assertCreated();

    $sent = null;
    Http::fake(function ($request) use (&$sent) {
        $sent = $request->data();

        return Http::response(['message' => 'ok'], 202);
    });

    $opened = $this->postJson(
        sessionCaptureUrl($project, $system).'/'.$created->json('capture.id').'/browser',
        ['token' => $created->json('token')],
    )->assertOk();

    expect($sent['vnc_password'] ?? null)->toBeString()->and(strlen($sent['vnc_password']))->toBe(16)
        ->and($sent['login_url'] ?? null)->toBe('https://alvo.example')
        ->and($sent['complete_url'] ?? null)->toBe(
            'http://host.containers.internal:8000/api/session-captures/'.$created->json('token').'/complete',
        )
        ->and($opened->json('novnc_url'))->toBe(
            'http://127.0.0.1:6080/vnc.html?autoconnect=1&resize=scale&password='.$sent['vnc_password'],
        );

    $system->update(['login_url' => 'http://rabbitmq:15672']);

    $sentAgain = null;
    Http::fake(function ($request) use (&$sentAgain) {
        $sentAgain = $request->data();

        return Http::response(['message' => 'ok'], 202);
    });

    $this->postJson(
        sessionCaptureUrl($project, $system).'/'.$created->json('capture.id').'/browser',
        ['token' => $created->json('token')],
    )->assertOk();

    expect($sentAgain['login_url'] ?? null)->toBe('https://alvo.example');
});

test('browser state ciphertext does not contain the plaintext secret', function () {
    $secret = 'plain-session-token';
    $envelope = app(BrowserStateCipher::class)->encrypt(json_encode([
        'cookies' => [['name' => 'session_id', 'value' => $secret]],
    ], JSON_THROW_ON_ERROR));

    expect(json_encode($envelope))->not->toContain($secret)
        ->and($envelope['alg'])->toBe('AES-256-GCM')
        ->and($envelope['v'])->toBe(1);
});
