<?php

namespace App\Services\Remediation\Ai;

class AiResponseValidator
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function validate(array $payload, string $systemResultId): array
    {
        $required = [
            'root_cause',
            'risk_summary',
            'suggested_fix',
            'validation',
        ];

        foreach ($required as $key) {
            if (! array_key_exists($key, $payload)) {
                throw new \InvalidArgumentException("AI response missing field: {$key}");
            }
        }

        if (! is_array($payload['suggested_fix'])) {
            throw new \InvalidArgumentException('AI response suggested_fix must be an object.');
        }

        if (! is_array($payload['validation'])) {
            throw new \InvalidArgumentException('AI response validation must be an object.');
        }

        $confidence = $payload['validation']['confidence'] ?? 'medium';

        if (! in_array($confidence, ['high', 'medium', 'low'], true)) {
            $confidence = 'medium';
        }

        return [
            'system_result_id' => $systemResultId,
            'location' => [
                'file' => $payload['location']['file'] ?? null,
                'line' => isset($payload['location']['line']) ? (int) $payload['location']['line'] : null,
            ],
            'root_cause' => (string) $payload['root_cause'],
            'risk_summary' => (string) $payload['risk_summary'],
            'suggested_fix' => [
                'description' => (string) ($payload['suggested_fix']['description'] ?? ''),
                'code' => (string) ($payload['suggested_fix']['code'] ?? ''),
            ],
            'validation' => [
                'why_this_fixes' => (string) ($payload['validation']['why_this_fixes'] ?? ''),
                'confidence' => $confidence,
                'syntax_valid' => (bool) ($payload['validation']['syntax_valid'] ?? false),
            ],
            'references' => is_array($payload['references'] ?? null)
                ? array_values(array_map('strval', $payload['references']))
                : [],
        ];
    }
}
