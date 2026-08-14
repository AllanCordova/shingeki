<?php

use App\Enums\TargetAccess\SignatureStatus;
use App\Models\TargetAccess\Signature;
use App\Services\TargetAccess\Signature\SignatureStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = new SignatureStatusService;
});

test('resolves enum instance', function () {
    expect($this->service->resolve(SignatureStatus::Permitted))
        ->toBe(SignatureStatus::Permitted);
});

test('resolves string status case insensitively', function () {
    expect($this->service->resolve('permitted'))->toBe(SignatureStatus::Permitted)
        ->and($this->service->resolve('DENIED'))->toBe(SignatureStatus::Denied);
});

test('throws for invalid status string', function () {
    $this->service->resolve('INVALID');
})->throws(InvalidArgumentException::class);

test('detects permitted denied expired and active states', function () {
    $permitted = Signature::factory()->permitted()->create();
    $denied = Signature::factory()->create(['status' => SignatureStatus::Denied]);
    $expired = Signature::factory()->expired()->create();

    expect($this->service->isPermitted($permitted))->toBeTrue()
        ->and($this->service->isDenied($denied))->toBeTrue()
        ->and($this->service->isExpired($expired))->toBeTrue()
        ->and($this->service->isActive($permitted))->toBeTrue()
        ->and($this->service->isActive($expired))->toBeFalse();
});

test('inactive when token is empty', function () {
    $signature = Signature::factory()->create(['token' => '']);

    expect($this->service->isActive($signature))->toBeFalse();
});
