<?php

namespace App\Services\Security;

class SensitiveDataRedactor
{
    /**
     * @var list<string>
     */
    private const HEADER_NAMES = [
        'authorization',
        'cookie',
        'set-cookie',
        'proxy-authorization',
        'x-api-key',
        'x-auth-token',
        'x-access-token',
    ];

    public function redactString(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        $redacted = preg_replace(
            '/(?i)(authorization|cookie|set-cookie|proxy-authorization|x-api-key|x-auth-token|x-access-token)\s*[:=]\s*\S+/',
            '$1: [REDACTED]',
            $value,
        );

        $redacted = preg_replace(
            '/(?i)(bearer|basic)\s+[A-Za-z0-9\-\._~\+\/]+=*/',
            '$1 [REDACTED]',
            $redacted ?? $value,
        );

        return is_string($redacted) ? $redacted : $value;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function redactArray(array $payload): array
    {
        $redacted = [];

        foreach ($payload as $key => $value) {
            $normalized = strtolower((string) $key);

            if (in_array($normalized, self::HEADER_NAMES, true) || str_contains($normalized, 'token') || str_contains($normalized, 'secret') || str_contains($normalized, 'password')) {
                $redacted[$key] = '[REDACTED]';

                continue;
            }

            if (is_array($value)) {
                $redacted[$key] = $this->redactArray($value);

                continue;
            }

            if (is_string($value)) {
                $redacted[$key] = $this->redactString($value);

                continue;
            }

            $redacted[$key] = $value;
        }

        return $redacted;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function summarizeQueuePayload(array $payload): array
    {
        return [
            'event' => $payload['event'] ?? $payload['payload']['event'] ?? null,
            'dispatch_id' => $payload['dispatch_id'] ?? $payload['payload']['dispatch_id'] ?? null,
            'import_id' => $payload['import_id'] ?? $payload['payload']['import_id'] ?? null,
            'system_id' => $payload['system_id'] ?? $payload['payload']['system_id'] ?? null,
            'attack_id' => $payload['attack_id'] ?? $payload['payload']['attack_id'] ?? null,
            'body_sha256' => hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR)),
        ];
    }
}
