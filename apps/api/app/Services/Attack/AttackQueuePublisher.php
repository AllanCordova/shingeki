<?php

namespace App\Services\Attack;

use App\Enums\Attack\AttackDepth;
use App\Enums\Attack\AttackScanType;
use App\Models\Attack\Attack;
use App\Models\Attack\AttackDispatch;
use App\Models\System\System;
use App\Models\User\User;
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
            $payload['auth'] = $this->objectifyAuthStorageMaps($targetAuth);
        }

        $message = json_encode($payload, JSON_THROW_ON_ERROR);

        $connection->pushRaw($message, $dispatchQueue);
    }

    /**
     * PHP json_encode turns empty assoc arrays into []. The DAST worker expects objects.
     *
     * @param  array<string, mixed>  $auth
     * @return array<string, mixed>
     */
    private function objectifyAuthStorageMaps(array $auth): array
    {
        $storage = $auth['storage'] ?? null;
        if (! is_array($storage)) {
            return $auth;
        }

        foreach (['local', 'session'] as $key) {
            if (array_key_exists($key, $storage) && is_array($storage[$key])) {
                $storage[$key] = (object) $storage[$key];
            }
        }

        if (isset($storage['origins']) && is_array($storage['origins'])) {
            foreach ($storage['origins'] as $index => $origin) {
                if (! is_array($origin)) {
                    continue;
                }
                foreach (['local', 'session'] as $key) {
                    if (array_key_exists($key, $origin) && is_array($origin[$key])) {
                        $storage['origins'][$index][$key] = (object) $origin[$key];
                    }
                }
            }
        }

        $auth['storage'] = $storage;

        return $auth;
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
