<?php

namespace App\Services\Attack;

use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\System;
use App\Models\SystemResult;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use InvalidArgumentException;

class AttackResultProcessor
{
    /**
     * @param  array<string, mixed>  $message
     */
    public function process(array $message): SystemResult
    {
        $payload = $message['payload'] ?? $message;

        $attackId = $payload['attack_id'] ?? null;
        $systemId = $payload['system_id'] ?? null;
        $dispatchId = $payload['dispatch_id'] ?? null;

        if (! is_string($attackId) || ! is_string($systemId)) {
            throw new InvalidArgumentException('attack_id and system_id are required in the result payload.');
        }

        if ($dispatchId !== null && ! is_string($dispatchId)) {
            throw new InvalidArgumentException('dispatch_id must be a string when provided.');
        }

        $attack = Attack::query()->find($attackId);
        $system = System::query()->find($systemId);

        if ($attack === null || $system === null) {
            throw new ModelNotFoundException('Attack or system not found for the result payload.');
        }

        if (is_string($dispatchId)) {
            $dispatch = AttackDispatch::query()->find($dispatchId);

            if ($dispatch === null || $dispatch->system_id !== $system->id) {
                throw new ModelNotFoundException('Attack dispatch not found for the result payload.');
            }
        }

        foreach (['vulnerable_route', 'payload_used', 'evidence', 'http_request'] as $field) {
            if (! isset($payload[$field]) || ! is_string($payload[$field])) {
                throw new InvalidArgumentException("Field [{$field}] is required and must be a string.");
            }
        }

        return SystemResult::create([
            'system_id' => $system->id,
            'attack_dispatch_id' => $dispatchId,
            'attack_id' => $attack->id,
            'vulnerable_route' => $payload['vulnerable_route'],
            'payload_used' => $payload['payload_used'],
            'evidence' => $payload['evidence'],
            'http_request' => $payload['http_request'],
        ]);
    }
}
