<?php

use App\Enums\Catalog\CatalogImportType;
use App\Enums\Scanning\AttackScanType;
use App\Models\Catalog\Attack;
use App\Models\Identity\User;
use App\Models\Scanning\AttackDispatch;
use App\Models\Workspace\System;
use App\Services\Catalog\Import\CatalogImportQueuePublisher;
use App\Services\Scanning\Attack\AttackQueuePublisher;
use Illuminate\Database\Eloquent\Collection;

test('attack dispatch batch payload keeps the worker contract', function () {
    $user = User::factory()->create();
    $system = System::factory()->create([
        'target_url' => 'https://target.test',
        'repository_url' => 'https://github.com/org/repo',
    ]);
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
        'scan_type' => AttackScanType::Dast,
    ]);
    $attack = Attack::factory()->for($user)->create();

    $payload = app(AttackQueuePublisher::class)->buildDispatchPayload(
        $dispatch,
        $system,
        $user,
        new Collection([$attack]),
        AttackScanType::Dast,
        ['headers' => ['Cookie' => 'session=abc']],
    );

    expect($payload)->toHaveKeys([
        'event',
        'scan_type',
        'dispatch_id',
        'system_id',
        'user_id',
        'target_url',
        'repository_url',
        'attacks',
        'dispatched_at',
        'auth',
    ])
        ->and($payload['event'])->toBe('attack.dispatch.batch')
        ->and($payload['attacks'][0])->toHaveKeys([
            'attack_id',
            'category',
            'target_location',
            'risk_level',
            'payload',
        ]);
});

test('catalog import publisher event names stay stable', function () {
    $publisher = app(CatalogImportQueuePublisher::class);
    $method = new ReflectionMethod($publisher, 'eventFor');

    expect($method->invoke($publisher, CatalogImportType::Attacks))->toBe('catalog.attacks.import.batch')
        ->and($method->invoke($publisher, CatalogImportType::Remediations))->toBe('catalog.remediations.import.batch');
});
