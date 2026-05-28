<?php

namespace App\Services\Attack;

use App\Models\Attack;
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

        if (! is_string($attackId) || ! is_string($systemId)) {
            throw new InvalidArgumentException('attack_id and system_id are required in the result payload.');
        }

        $attack = Attack::query()->find($attackId);
        $system = System::query()->find($systemId);

        if ($attack === null || $system === null) {
            throw new ModelNotFoundException('Attack or system not found for the result payload.');
        }

        foreach (['vulnerable_route', 'payload_used', 'evidence', 'http_request'] as $field) {
            if (! isset($payload[$field]) || ! is_string($payload[$field])) {
                throw new InvalidArgumentException("Field [{$field}] is required and must be a string.");
            }
        }

        return SystemResult::create([
            'system_id' => $system->id,
            'attack_id' => $attack->id,
            'vulnerable_route' => $payload['vulnerable_route'],
            'payload_used' => $payload['payload_used'],
            'evidence' => $payload['evidence'],
            'http_request' => $payload['http_request'],
        ]);
    }
}
