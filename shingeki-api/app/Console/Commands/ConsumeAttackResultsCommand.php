<?php

namespace App\Console\Commands;

use App\Services\Attack\AttackResultProcessor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Throwable;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\Jobs\RabbitMQJob;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\RabbitMQQueue;

class ConsumeAttackResultsCommand extends Command
{
    protected $signature = 'attacks:consume-results
                            {--once : Process a single message and exit}
                            {--sleep=3 : Seconds to sleep when no message is available}';

    protected $description = 'Consume attack result messages from RabbitMQ and persist system results';

    public function handle(AttackResultProcessor $processor): int
    {
        $this->info('Listening for attack results on queue: '.config('attacks.queues.results'));

        do {
            /** @var RabbitMQQueue $connection */
            $connection = Queue::connection('rabbitmq');
            $job = $connection->pop(config('attacks.queues.results'));

            if ($job === null) {
                if ($this->option('once')) {
                    $this->comment('No messages in queue.');

                    return self::SUCCESS;
                }

                sleep((int) $this->option('sleep'));

                continue;
            }

            try {
                $payload = json_decode($job->getRawBody(), true, 512, JSON_THROW_ON_ERROR);
                $result = $processor->process($payload);

                $this->info("Stored system result [{$result->id}] for attack [{$result->attack_id}].");
            } catch (Throwable $exception) {
                Log::error('Failed to process attack result message.', [
                    'body' => $job instanceof RabbitMQJob ? $job->getRawBody() : null,
                    'exception' => $exception->getMessage(),
                ]);

                $this->error($exception->getMessage());
            } finally {
                $job->delete();
            }
        } while (! $this->option('once'));

        return self::SUCCESS;
    }
}
