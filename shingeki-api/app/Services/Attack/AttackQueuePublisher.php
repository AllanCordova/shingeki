<?php

namespace App\Services\Attack;

use App\Enums\AttackDepth;
use App\Enums\AttackScanType;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Queue;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\RabbitMQQueue;

class AttackQueuePublisher
{
    public function __construct(
        private readonly WorkerTargetUrlResolver $targetUrlResolver,
    ) {}

    /**
     * @param  Collection<int, Attack>  $attacks
     */
    public function publishDispatchBatch(
        AttackDispatch $dispatch,
        System $system,
        User $requestedBy,
        Collection $attacks,
        AttackScanType $scanType = AttackScanType::Dast,
        ?array $targetAuth = null,
    ): void {
        $connection = $this->connection();
        $dispatchQueue = $this->dispatchQueueFor($scanType);

        $connection->declareQueue($dispatchQueue);
        $connection->declareQueue(config('attacks.queues.results'));

        $payload = [
            'event' => 'attack.dispatch.batch',
            'scan_type' => $scanType->value,
            'depth' => ($dispatch->depth ?? AttackDepth::Full)->value,
            'dispatch_id' => $dispatch->id,
            'system_id' => $system->id,
            'user_id' => $requestedBy->id,
            'target_url' => $this->targetUrlResolver->forWorker($system->target_url),
            'repository_url' => $system->repository_url,
            'attacks' => $attacks
                ->map(fn (Attack $attack) => $this->formatAttackForQueue($attack))
                ->values()
                ->all(),
            'dispatched_at' => $dispatch->dispatched_at->toIso8601String(),
        ];

        if ($dispatch->start_path !== null) {
            $payload['start_path'] = $dispatch->start_path;
        }

        if ($dispatch->max_routes !== null) {
            $payload['max_routes'] = $dispatch->max_routes;
        }

        if ($targetAuth !== null) {
            $payload['auth'] = $targetAuth;
        }

        $message = json_encode($payload, JSON_THROW_ON_ERROR);

        $connection->pushRaw($message, $dispatchQueue);
    }

    private function dispatchQueueFor(AttackScanType $scanType): string
    {
        return match ($scanType) {
            AttackScanType::Dast => config('attacks.queues.dispatch'),
            AttackScanType::Sast => config('attacks.queues.sast_dispatch'),
        };
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
