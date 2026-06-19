<?php

namespace App\Services\Attack;

use App\Enums\DispatchProbeOutcome;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\DispatchProbe;
use App\Models\System;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use InvalidArgumentException;

class AttackProbeProcessor
{
    public const EVENT = 'attack.probe';

    /**
     * @param  array<string, mixed>  $message
     */
    public function process(array $message): DispatchProbe
    {
        $payload = $message['payload'] ?? $message;

        if (($payload['event'] ?? null) !== self::EVENT) {
            throw new InvalidArgumentException('Unexpected probe event.');
        }

        $attackId = $payload['attack_id'] ?? null;
        $systemId = $payload['system_id'] ?? null;
        $dispatchId = $payload['dispatch_id'] ?? null;
        $outcome = $payload['outcome'] ?? null;

        if (! is_string($attackId) || ! is_string($systemId) || ! is_string($dispatchId)) {
            throw new InvalidArgumentException('attack_id, system_id and dispatch_id are required.');
        }

        if (! is_string($outcome)) {
            throw new InvalidArgumentException('outcome is required and must be a string.');
        }

        $outcomeEnum = DispatchProbeOutcome::tryFrom($outcome);
        if ($outcomeEnum === null) {
            throw new InvalidArgumentException('Invalid probe outcome.');
        }

        $attack = Attack::query()->find($attackId);
        $system = System::query()->find($systemId);
        $dispatch = AttackDispatch::query()->find($dispatchId);

        if ($attack === null || $system === null || $dispatch === null || $dispatch->system_id !== $system->id) {
            throw new ModelNotFoundException('Attack, system or dispatch not found for the probe payload.');
        }

        foreach (['route', 'payload_used', 'evidence'] as $field) {
            if (! isset($payload[$field]) || ! is_string($payload[$field])) {
                throw new InvalidArgumentException("Field [{$field}] is required and must be a string.");
            }
        }

        $httpRequest = $payload['http_request'] ?? null;
        if ($httpRequest !== null && ! is_string($httpRequest)) {
            throw new InvalidArgumentException('http_request must be a string when provided.');
        }

        $errorMessage = $payload['error_message'] ?? null;
        if ($errorMessage !== null && ! is_string($errorMessage)) {
            throw new InvalidArgumentException('error_message must be a string when provided.');
        }

        if ($outcomeEnum === DispatchProbeOutcome::Error && ($errorMessage === null || $errorMessage === '')) {
            throw new InvalidArgumentException('error_message is required when outcome is error.');
        }

        return DispatchProbe::create([
            'attack_dispatch_id' => $dispatch->id,
            'system_id' => $system->id,
            'attack_id' => $attack->id,
            'route' => $payload['route'],
            'payload_used' => $payload['payload_used'],
            'http_request' => $httpRequest,
            'outcome' => $outcomeEnum,
            'evidence' => $payload['evidence'],
            'error_message' => $errorMessage,
        ]);
    }
}
