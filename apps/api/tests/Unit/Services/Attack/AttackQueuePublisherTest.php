<?php

use App\Enums\Attack\AttackScanType;
use App\Models\Attack\Attack;
use App\Models\Attack\AttackDispatch;
use App\Models\System\System;
use App\Models\User\User;
use App\Services\Attack\AttackQueuePublisher;
use Illuminate\Support\Facades\Queue;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\RabbitMQQueue;

test('publishDispatchBatch serializes scanner credentials onto the queue message', function () {
    $user = User::factory()->create();
    $system = System::factory()->create([
        'target_url' => 'https://app.example.com',
        'login_url' => 'https://app.example.com/login',
        'login_username' => 'scanner@example.com',
        'login_password' => 'secret-pass-123',
        'logged_in_indicator' => 'Logout',
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
        $system->queueAuth(),
    );

    expect($payload)->toBeArray()
        ->and($payload['event'])->toBe('attack.dispatch.batch')
        ->and($payload['auth'])->toMatchArray([
            'type' => 'credentials',
            'username' => 'scanner@example.com',
            'password' => 'secret-pass-123',
            'login_url' => 'https://app.example.com/login',
            'logged_in_indicator' => 'Logout',
        ]);
});
