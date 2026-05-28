<?php

use App\Enums\SignatureStatus;
use App\Models\Signature;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('permit updates status to permitted', function () {
    $signature = Signature::factory()->create(['status' => SignatureStatus::Denied]);

    $signature->permit();

    expect($signature->fresh()->status)->toBe(SignatureStatus::Permitted);
});

test('deny updates status to denied', function () {
    $signature = Signature::factory()->permitted()->create();

    $signature->deny();

    expect($signature->fresh()->status)->toBe(SignatureStatus::Denied);
});

test('setStatus accepts string value', function () {
    $signature = Signature::factory()->create();

    $signature->setStatus('PERMITTED');

    expect($signature->fresh()->status)->toBe(SignatureStatus::Permitted);
});

test('setStatus throws for invalid string', function () {
    $signature = Signature::factory()->create();

    $signature->setStatus('INVALID');
})->throws(InvalidArgumentException::class);

test('revoke deletes the signature record', function () {
    $signature = Signature::factory()->create();

    $signature->revoke();

    expect(Signature::query()->find($signature->id))->toBeNull();
});

test('belongs to user and system', function () {
    $signature = Signature::factory()->create();

    expect($signature->user)->not->toBeNull()
        ->and($signature->system)->not->toBeNull();
});
