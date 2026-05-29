<?php

namespace App\Services\Attack;

use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Queue;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\RabbitMQQueue;

class AttackQueuePublisher
{
    /**
     * @param  Collection<int, Attack>  $attacks
     */
    public function publishDispatchBatch(
        AttackDispatch $dispatch,
        System $system,
        User $requestedBy,
        Collection $attacks,
    ): void {
        $connection = $this->connection();
        $connection->declareQueue(config('attacks.queues.dispatch'));
        $connection->declareQueue(config('attacks.queues.results'));

        $message = json_encode([
            'event' => 'attack.dispatch.batch',
            'dispatch_id' => $dispatch->id,
            'system_id' => $system->id,
            'user_id' => $requestedBy->id,
            'target_url' => $system->target_url,
            'repository_url' => $system->repository_url,
            'attacks' => $attacks
                ->map(fn (Attack $attack) => $this->formatAttackForQueue($attack))
                ->values()
                ->all(),
            'dispatched_at' => $dispatch->dispatched_at->toIso8601String(),
        ], JSON_THROW_ON_ERROR);

        $this->connection()->pushRaw($message, config('attacks.queues.dispatch'));
    }

    /**
     * @return array<string, mixed>
     */
    private function formatAttackForQueue(Attack $attack): array
    {
        return [
            'attack_id' => $attack->id,
            'category' => $attack->category->value,
            'target_location' => $attack->target_location->value,
            'risk_level' => $attack->risk_level->value,
            'payload' => $attack->payload,
        ];
    }

    private function connection(): RabbitMQQueue
    {
        /** @var RabbitMQQueue $connection */
        $connection = Queue::connection('rabbitmq');

        return $connection;
    }
}
