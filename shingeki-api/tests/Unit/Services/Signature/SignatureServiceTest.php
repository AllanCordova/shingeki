<?php

use App\Enums\SignatureStatus;
use App\Models\Signature;
use App\Models\System;
use App\Models\User;
use App\Services\Signature\SignatureHtmlVerifier;
use App\Services\Signature\SignatureService;
use App\Services\Signature\SignatureStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = new SignatureService(
        new SignatureStatusService,
        new SignatureHtmlVerifier,
    );
});

test('generate creates random token with denied status', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();

    $signature = $this->service->generate($user, $system, '127.0.0.1');

    expect($signature->token)->toHaveLength(64)
        ->and($signature->status)->toBe(SignatureStatus::Denied)
        ->and($signature->user_id)->toBe($user->id)
        ->and($signature->system_id)->toBe($system->id)
        ->and($signature->ip_address)->toBe('127.0.0.1');
});

test('generate revokes previous active signatures for same user and system', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $previous = Signature::factory()->for($user)->for($system)->create();

    $this->service->generate($user, $system, '10.0.0.1');

    expect(Signature::query()->find($previous->id))->toBeNull()
        ->and(Signature::query()->where('user_id', $user->id)->where('system_id', $system->id)->count())->toBe(1);
});

test('validate permits signature when token exists in html', function () {
    $user = User::factory()->create();
    $system = System::factory()->create(['target_url' => 'https://target.test']);
    $signature = Signature::factory()->for($user)->for($system)->create([
        'token' => 'verify-me-token',
        'status' => SignatureStatus::Denied,
    ]);

    Http::fake([
        'https://target.test' => Http::response(
            '<html><head><meta name="shingeki-signature" content="verify-me-token"></head></html>',
            200,
        ),
    ]);

    $result = $this->service->validate($user, $system);

    expect($result['found_in_html'])->toBeTrue()
        ->and($result['permitted'])->toBeTrue()
        ->and($result['signature']->status)->toBe(SignatureStatus::Permitted);
});

test('validate denies signature when token is not in html', function () {
    $user = User::factory()->create();
    $system = System::factory()->create(['target_url' => 'https://target.test']);
    Signature::factory()->for($user)->for($system)->create([
        'token' => 'missing-token',
        'status' => SignatureStatus::Denied,
    ]);

    Http::fake([
        'https://target.test' => Http::response('<html><head></head></html>', 200),
    ]);

    $result = $this->service->validate($user, $system);

    expect($result['found_in_html'])->toBeFalse()
        ->and($result['permitted'])->toBeFalse()
        ->and($result['signature']->status)->toBe(SignatureStatus::Denied);
});

test('validate throws when no active signature exists', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();

    $this->service->validate($user, $system);
})->throws(RuntimeException::class, 'No active signature token found for this system.');

test('validate throws when signature is expired', function () {
    $user = User::factory()->create();
    $system = System::factory()->create(['target_url' => 'https://target.test']);
    Signature::factory()->for($user)->for($system)->expired()->create();

    Http::fake();

    $this->service->validate($user, $system);
})->throws(RuntimeException::class, 'Signature token has expired.');

test('revoke deletes active signature', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $signature = Signature::factory()->for($user)->for($system)->create();

    $this->service->revoke($user, $system);

    expect(Signature::query()->find($signature->id))->toBeNull();
});

test('exists returns whether active signature is present', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();

    expect($this->service->exists($user, $system))->toBeFalse();

    Signature::factory()->for($user)->for($system)->create();

    expect($this->service->exists($user, $system))->toBeTrue();
});
