<?php

namespace App\Services\Attack;

use App\Models\Attack\AttackDispatch;
use App\Models\System\System;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use InvalidArgumentException;

class AttackDispatchProgressProcessor
{
    public const EVENT = 'attack.dispatch.progress';

    /**
     * @param  array<string, mixed>  $message
     */
    public function process(array $message): AttackDispatch
    {
        $payload = $message['payload'] ?? $message;

        if (($payload['event'] ?? null) !== self::EVENT) {
            throw new InvalidArgumentException('Unexpected progress event.');
        }

        $dispatchId = $payload['dispatch_id'] ?? null;
        $systemId = $payload['system_id'] ?? null;
        $vectorsDiscovered = $payload['vectors_discovered'] ?? null;
        $jobsPlanned = $payload['jobs_planned'] ?? null;

        if (! is_string($dispatchId) || ! is_string($systemId)) {
            throw new InvalidArgumentException('dispatch_id and system_id are required.');
        }

        if (! is_int($vectorsDiscovered) && ! is_numeric($vectorsDiscovered)) {
            throw new InvalidArgumentException('vectors_discovered is required and must be numeric.');
        }

        if (! is_int($jobsPlanned) && ! is_numeric($jobsPlanned)) {
            throw new InvalidArgumentException('jobs_planned is required and must be numeric.');
        }

        $dispatch = AttackDispatch::query()->find($dispatchId);
        $system = System::query()->find($systemId);

        if ($dispatch === null || $system === null || $dispatch->system_id !== $system->id) {
            throw new ModelNotFoundException('Attack dispatch or system not found for progress payload.');
        }

        if ($dispatch->completed_at !== null || $dispatch->failed_at !== null || $dispatch->cancelled_at !== null || $dispatch->session_expired_at !== null) {
            return $dispatch;
        }

        $dispatch->update([
            'vectors_discovered' => (int) $vectorsDiscovered,
            'jobs_planned' => (int) $jobsPlanned,
        ]);

        return $dispatch->fresh();
    }
}
