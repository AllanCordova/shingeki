<?php

use App\Enums\TargetAccess\SignatureStatus;
use App\Models\Identity\User;
use App\Models\TargetAccess\Signature;
use App\Models\Workspace\System;
use App\Services\TargetAccess\Signature\SignatureAuthorizationService;
use App\Services\TargetAccess\Signature\SignatureStatusService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = new SignatureAuthorizationService(new SignatureStatusService);
});

test('assertPermittedForSystem passes for permitted signature', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $signature = Signature::factory()->for($user)->for($system)->permitted()->create([
        'token' => str_repeat('a', 64),
    ]);

    $result = $this->service->assertPermittedForSystem($user, $system);

    expect($result->id)->toBe($signature->id);
});

test('assertPermittedForSystem rejects when no signature exists', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();

    $this->service->assertPermittedForSystem($user, $system);
})->throws(AuthorizationException::class, 'No signature token found for this system.');

test('assertPermittedForSystem rejects denied signature', function () {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Signature::factory()->for($user)->for($system)->create([
        'token' => str_repeat('b', 64),
        'status' => SignatureStatus::Denied,
    ]);

    $this->service->assertPermittedForSystem($user, $system);
})->throws(AuthorizationException::class, 'Signature token is not permitted for attacks.');
