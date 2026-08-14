<?php

namespace App\Support\Queue;

use InvalidArgumentException;

trait ValidatesQueuePayload
{
    protected function requireBoundedString(array $payload, string $field, bool $required = true): ?string
    {
        $max = (int) config('security.queue.max_string_bytes', 16384);

        if (! isset($payload[$field])) {
            if ($required) {
                throw new InvalidArgumentException("Field [{$field}] is required and must be a string.");
            }

            return null;
        }

        if (! is_string($payload[$field])) {
            throw new InvalidArgumentException("Field [{$field}] is required and must be a string.");
        }

        if (strlen($payload[$field]) > $max) {
            throw new InvalidArgumentException("Field [{$field}] exceeds the maximum allowed length.");
        }

        return $payload[$field];
    }

    /**
     * @param  list<string>  $parts
     */
    protected function dedupeKey(array $parts): string
    {
        return hash('sha256', implode("\n", $parts));
    }
}
