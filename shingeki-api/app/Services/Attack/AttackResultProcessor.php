<?php

namespace App\Services\Attack;

use App\Models\Attack\Attack;
use App\Models\Attack\AttackDispatch;
use App\Models\System\System;
use App\Models\System\SystemResult;
use App\Services\Source\SourceFileNormalizer;
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
            ...$this->optionalLocationFields($payload),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function optionalLocationFields(array $payload): array
    {
        $fields = [];

        if (isset($payload['source_file']) && is_string($payload['source_file']) && $payload['source_file'] !== '') {
            $normalized = SourceFileNormalizer::normalize($payload['source_file']);

            if ($normalized !== null) {
                $fields['source_file'] = $normalized;
            }
        }

        if (isset($payload['start_line']) && is_numeric($payload['start_line'])) {
            $fields['start_line'] = (int) $payload['start_line'];
        }

        if (isset($payload['end_line']) && is_numeric($payload['end_line'])) {
            $fields['end_line'] = (int) $payload['end_line'];
        }

        if (isset($payload['matched_snippet']) && is_string($payload['matched_snippet']) && $payload['matched_snippet'] !== '') {
            $fields['matched_snippet'] = $payload['matched_snippet'];
        }

        if (! isset($fields['source_file']) && isset($fields['start_line'])) {
            $location = SourceFileNormalizer::locationFromResult(
                null,
                $fields['start_line'],
                $fields['end_line'] ?? null,
                isset($payload['vulnerable_route']) && is_string($payload['vulnerable_route'])
                    ? $payload['vulnerable_route']
                    : null,
            );

            if ($location !== null) {
                $fields['source_file'] = $location['file'];
            }
        }

        return $fields;
    }
}
