<?php

use App\Enums\Attack\AttackScanType;
use App\Models\Attack\Attack;
use App\Models\Attack\AttackDispatch;
use App\Models\System\System;
use App\Models\User\User;
use App\Services\Attack\AttackQueuePublisher;
use Illuminate\Support\Facades\Queue;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\RabbitMQQueue;

test('publishDispatchBatch serializes the encrypted browser state envelope', function () {
    $user = User::factory()->create();
    $system = System::factory()->create([
        'target_url' => 'https://app.example.com',
        'login_url' => 'https://app.example.com/login',
    ]);
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();
    $attacks = Attack::factory()->count(1)->create();

    $connection = Mockery::mock(RabbitMQQueue::class);
    $connection->shouldReceive('declareQueue')->twice();

    $payload = null;
    $connection->shouldReceive('pushRaw')
        ->once()
        ->withArgs(function (string $message, string $queue) use (&$payload) {
            $payload = json_decode($message, true, 512, JSON_THROW_ON_ERROR);

            return $queue === config('attacks.queues.dispatch');
        });

    Queue::shouldReceive('connection')->with('rabbitmq')->andReturn($connection);

    app(AttackQueuePublisher::class)->publishDispatchBatch(
        $dispatch,
        $system,
        $user,
        $attacks,
        AttackScanType::Dast,
        [
            'type' => 'browser_state',
            'state' => [
                'v' => 1,
                'alg' => 'AES-256-GCM',
                'nonce' => 'bm9uY2UtMTJieXRlcyE=',
                'ct' => 'Y2lwaGVydGV4dC1ub3QtdGhlLXRva2Vu',
            ],
        ],
    );

    expect($payload)->toBeArray()
        ->and($payload['event'])->toBe('attack.dispatch.batch')
        ->and($payload['auth']['type'])->toBe('browser_state')
        ->and($payload['auth']['state']['ct'])->toBe('Y2lwaGVydGV4dC1ub3QtdGhlLXRva2Vu')
        ->and(json_encode($payload))->not->toContain('session_id');
});

test('publishDispatchBatch includes the exclusive route map', function () {
    $user = User::factory()->create();
    $system = System::factory()->create([
        'target_url' => 'https://api.example.com',
    ]);
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
        'route_map' => [
            ['method' => 'GET', 'path' => '/api/v1/user'],
            ['method' => 'POST', 'path' => '/api/v1/product', 'body' => ['name' => 'exemplo']],
        ],
    ]);
    $attacks = Attack::factory()->count(1)->create();

    $connection = Mockery::mock(RabbitMQQueue::class);
    $connection->shouldReceive('declareQueue')->twice();

    $payload = null;
    $connection->shouldReceive('pushRaw')
        ->once()
        ->withArgs(function (string $message, string $queue) use (&$payload) {
            $payload = json_decode($message, true, 512, JSON_THROW_ON_ERROR);

            return $queue === config('attacks.queues.dispatch');
        });

    Queue::shouldReceive('connection')->with('rabbitmq')->andReturn($connection);

    app(AttackQueuePublisher::class)->publishDispatchBatch(
        $dispatch,
        $system,
        $user,
        $attacks,
        AttackScanType::Dast,
    );

    expect($payload['route_map'])->toBe([
        ['method' => 'GET', 'path' => '/api/v1/user'],
        ['method' => 'POST', 'path' => '/api/v1/product', 'body' => ['name' => 'exemplo']],
    ]);
});
