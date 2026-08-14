<?php

namespace App\Services\Scanning\Attack;

use App\Models\Scanning\AttackDispatch;
use App\Models\Workspace\System;
use App\Services\Notifications\UserNotificationService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use InvalidArgumentException;

class AttackDispatchCompletionProcessor
{
    public const EVENT = 'attack.dispatch.completed';

    public function __construct(
        private readonly UserNotificationService $userNotificationService,
    ) {}

    /**
     * @param  array<string, mixed>  $message
     */
    public function process(array $message): AttackDispatch
    {
        $payload = $message['payload'] ?? $message;

        if (($payload['event'] ?? null) !== self::EVENT) {
            throw new InvalidArgumentException('Unexpected completion event.');
        }

        $dispatchId = $payload['dispatch_id'] ?? null;
        $systemId = $payload['system_id'] ?? null;
        $durationMs = $payload['duration_ms'] ?? null;
        $findingsCount = $payload['findings_count'] ?? null;
        $probesCount = $payload['probes_count'] ?? 0;
        $vectorsDiscovered = $payload['vectors_discovered'] ?? null;
        $jobsPlanned = $payload['jobs_planned'] ?? null;

        if (! is_string($dispatchId) || ! is_string($systemId)) {
            throw new InvalidArgumentException('dispatch_id and system_id are required.');
        }

        if (! is_int($durationMs) && ! is_numeric($durationMs)) {
            throw new InvalidArgumentException('duration_ms is required and must be numeric.');
        }

        if (! is_int($findingsCount) && ! is_numeric($findingsCount)) {
            throw new InvalidArgumentException('findings_count is required and must be numeric.');
        }

        if (! is_int($probesCount) && ! is_numeric($probesCount)) {
            throw new InvalidArgumentException('probes_count must be numeric.');
        }

        if ($vectorsDiscovered !== null && ! is_int($vectorsDiscovered) && ! is_numeric($vectorsDiscovered)) {
            throw new InvalidArgumentException('vectors_discovered must be numeric when provided.');
        }

        if ($jobsPlanned !== null && ! is_int($jobsPlanned) && ! is_numeric($jobsPlanned)) {
            throw new InvalidArgumentException('jobs_planned must be numeric when provided.');
        }

        $dispatch = AttackDispatch::query()->find($dispatchId);
        $system = System::query()->find($systemId);

        if ($dispatch === null || $system === null || $dispatch->system_id !== $system->id) {
            throw new ModelNotFoundException('Attack dispatch or system not found for completion payload.');
        }

        $dispatch->update([
            'completed_at' => now(),
            'duration_ms' => (int) $durationMs,
            'findings_count' => (int) $findingsCount,
            'probes_count' => (int) $probesCount,
            'vectors_discovered' => $vectorsDiscovered === null ? null : (int) $vectorsDiscovered,
            'jobs_planned' => $jobsPlanned === null ? null : (int) $jobsPlanned,
        ]);

        $dispatch = $dispatch->fresh();
        $this->userNotificationService->completeAttackDispatch($dispatch);

        return $dispatch;
    }
}
