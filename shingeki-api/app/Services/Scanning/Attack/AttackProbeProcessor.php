<?php

namespace App\Services\Scanning\Attack;

use App\Enums\Scanning\DispatchProbeOutcome;
use App\Models\Catalog\Attack;
use App\Models\Scanning\AttackDispatch;
use App\Models\Scanning\DispatchProbe;
use App\Models\Workspace\System;
use App\Support\Queue\ValidatesQueuePayload;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use InvalidArgumentException;

class AttackProbeProcessor
{
    use ValidatesQueuePayload;

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

        $route = $this->requireBoundedString($payload, 'route');
        $payloadUsed = $this->requireBoundedString($payload, 'payload_used');
        $evidence = $this->requireBoundedString($payload, 'evidence');
        $httpRequest = $this->requireBoundedString($payload, 'http_request', required: false);
        $errorMessage = $this->requireBoundedString($payload, 'error_message', required: false);

        if ($outcomeEnum === DispatchProbeOutcome::Error && ($errorMessage === null || $errorMessage === '')) {
            throw new InvalidArgumentException('error_message is required when outcome is error.');
        }

        $dedupeKey = is_string($payload['event_id'] ?? null)
            ? $this->dedupeKey([(string) $payload['event_id']])
            : $this->dedupeKey([
                $dispatch->id,
                $attack->id,
                $system->id,
                $route,
                $payloadUsed,
                $outcomeEnum->value,
                (string) $httpRequest,
                (string) $evidence,
            ]);

        return DispatchProbe::query()->firstOrCreate(
            ['dedupe_key' => $dedupeKey],
            [
                'attack_dispatch_id' => $dispatch->id,
                'system_id' => $system->id,
                'attack_id' => $attack->id,
                'route' => $route,
                'payload_used' => $payloadUsed,
                'http_request' => $httpRequest,
                'outcome' => $outcomeEnum,
                'evidence' => $evidence,
                'error_message' => $errorMessage,
            ],
        );
    }
}
