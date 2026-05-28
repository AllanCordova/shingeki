<?php

use App\Enums\SignatureStatus;
use App\Models\Signature;
use App\Models\System;
use App\Models\User;
use App\Services\Signature\SignatureAuthorizationService;
use App\Services\Signature\SignatureStatusService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = new SignatureAuthorizationService(new SignatureStatusService);
});

test('assertPermittedToken passes for permitted signature', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $signature = Signature::factory()->for($user)->for($system)->permitted()->create([
        'token' => str_repeat('a', 64),
    ]);

    $result = $this->service->assertPermittedToken($user, $system, $signature->token);

    expect($result->id)->toBe($signature->id);
});

test('assertPermittedToken rejects invalid token', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();

    $this->service->assertPermittedToken($user, $system, str_repeat('x', 64));
})->throws(AuthorizationException::class);

test('assertPermittedToken rejects denied signature', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $signature = Signature::factory()->for($user)->for($system)->create([
        'token' => str_repeat('b', 64),
        'status' => SignatureStatus::Denied,
    ]);

    $this->service->assertPermittedToken($user, $system, $signature->token);
})->throws(AuthorizationException::class);
