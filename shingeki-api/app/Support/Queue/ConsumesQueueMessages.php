<?php

namespace App\Support\Queue;

use InvalidArgumentException;
use JsonException;
use Throwable;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\Jobs\RabbitMQJob;

trait ConsumesQueueMessages
{
    protected function maxAttempts(): int
    {
        return max(1, (int) config('security.queue.max_attempts', 5));
    }

    protected function backoffSeconds(int $attempts): int
    {
        $base = max(1, (int) config('security.queue.backoff_seconds', 5));

        return min(60, $base * (2 ** max(0, $attempts - 1)));
    }

    protected function isPermanentFailure(Throwable $exception): bool
    {
        return $exception instanceof InvalidArgumentException
            || $exception instanceof JsonException;
    }

    protected function releaseOrDrop(mixed $job, Throwable $exception): void
    {
        if (! $job instanceof RabbitMQJob) {
            return;
        }

        if ($this->isPermanentFailure($exception) || $job->attempts() >= $this->maxAttempts()) {
            $job->delete();

            return;
        }

        $job->release($this->backoffSeconds($job->attempts()));
    }
}
