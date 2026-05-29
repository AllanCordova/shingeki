<?php

namespace App\Services\Attack;

use App\Models\AttackDispatch;
use App\Models\System;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use InvalidArgumentException;

class AttackDispatchCompletionProcessor
{
    public const EVENT = 'attack.dispatch.completed';

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

        if (! is_string($dispatchId) || ! is_string($systemId)) {
            throw new InvalidArgumentException('dispatch_id and system_id are required.');
        }

        if (! is_int($durationMs) && ! is_numeric($durationMs)) {
            throw new InvalidArgumentException('duration_ms is required and must be numeric.');
        }

        if (! is_int($findingsCount) && ! is_numeric($findingsCount)) {
            throw new InvalidArgumentException('findings_count is required and must be numeric.');
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
        ]);

        return $dispatch->fresh();
    }
}
