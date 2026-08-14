<?php

use App\Enums\Catalog\CatalogImportType;
use App\Enums\Scanning\AttackScanType;
use App\Models\Catalog\Attack;
use App\Models\Catalog\CatalogImport;
use App\Models\Identity\User;
use App\Models\Scanning\AttackDispatch;
use App\Models\Scanning\SystemResult;
use App\Models\Workspace\System;
use App\Services\Catalog\Import\CatalogImportQueuePublisher;
use App\Services\Scanning\Attack\AttackQueuePublisher;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Throwable;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\Jobs\RabbitMQJob;

beforeEach(function () {
    if (! filter_var(env('RABBITMQ_INTEGRATION', false), FILTER_VALIDATE_BOOL)) {
        test()->markTestSkipped('Set RABBITMQ_INTEGRATION=true with a reachable RabbitMQ broker.');
    }

    try {
        Queue::connection('rabbitmq')->declareQueue('tests.rabbitmq.health');
    } catch (Throwable $exception) {
        test()->markTestSkipped('RabbitMQ is not reachable: '.$exception->getMessage());
    }
});

test('attack publisher and results consumer round-trip through RabbitMQ', function () {
    $suffix = Str::uuid()->toString();
    $dispatchQueue = 'tests.attacks.dispatch.'.$suffix;
    $resultsQueue = 'tests.attacks.results.'.$suffix;

    config([
        'attacks.queues.dispatch' => $dispatchQueue,
        'attacks.queues.results' => $resultsQueue,
    ]);

    $user = User::factory()->create();
    $system = System::factory()->create([
        'target_url' => 'https://target.test',
        'repository_url' => 'https://github.com/org/repo',
    ]);
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
        'scan_type' => AttackScanType::Dast,
    ]);
    $attack = Attack::factory()->for($user)->create();

    app(AttackQueuePublisher::class)->publishDispatchBatch(
        $dispatch,
        $system,
        $user,
        new Collection([$attack]),
        AttackScanType::Dast,
    );

    $connection = Queue::connection('rabbitmq');
    $published = $connection->pop($dispatchQueue);

    expect($published)->toBeInstanceOf(RabbitMQJob::class);

    $payload = json_decode($published->getRawBody(), true, 512, JSON_THROW_ON_ERROR);
    $published->delete();

    expect($payload)
        ->toHaveKeys([
            'event',
            'scan_type',
            'dispatch_id',
            'system_id',
            'user_id',
            'target_url',
            'attacks',
        ])
        ->and($payload['event'])->toBe('attack.dispatch.batch')
        ->and($payload['dispatch_id'])->toBe($dispatch->id);

    $connection->declareQueue($resultsQueue);
    $connection->pushRaw(json_encode([
        'event' => 'attack.result',
        'attack_id' => $attack->id,
        'system_id' => $system->id,
        'dispatch_id' => $dispatch->id,
        'vulnerable_route' => '/login',
        'payload_used' => "' OR 1=1",
        'evidence' => 'sql error',
        'http_request' => 'GET /login',
    ], JSON_THROW_ON_ERROR), $resultsQueue);

    $this->artisan('attacks:consume-results', ['--once' => true])->assertSuccessful();

    expect(SystemResult::query()->where('attack_id', $attack->id)->where('system_id', $system->id)->exists())
        ->toBeTrue();
});

test('catalog import publisher round-trips a batch through RabbitMQ', function () {
    $queue = 'tests.catalog.attacks.import.'.Str::uuid()->toString();
    config(['catalog.queues.attacks_import' => $queue]);

    $user = User::factory()->create();
    $import = CatalogImport::factory()->for($user)->create([
        'type' => CatalogImportType::Attacks,
    ]);

    app(CatalogImportQueuePublisher::class)->publish(
        $import,
        $user,
        CatalogImportType::Attacks,
        [[
            'name' => 'SQLi probe',
            'category' => 'sql_injection',
        ]],
    );

    $job = Queue::connection('rabbitmq')->pop($queue);

    expect($job)->toBeInstanceOf(RabbitMQJob::class);

    $payload = json_decode($job->getRawBody(), true, 512, JSON_THROW_ON_ERROR);
    $job->delete();

    expect($payload)
        ->toHaveKeys(['event', 'import_id', 'user_id', 'items', 'chunk_index', 'chunk_total'])
        ->and($payload['event'])->toBe('catalog.attacks.import.batch')
        ->and($payload['import_id'])->toBe($import->id)
        ->and($payload['items'])->toHaveCount(1);
});
