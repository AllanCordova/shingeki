<?php

namespace App\Console\Commands;

use App\Services\CatalogImport\CatalogImportService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Throwable;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\Jobs\RabbitMQJob;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\RabbitMQQueue;

class ConsumeCatalogImportsCommand extends Command
{
    protected $signature = 'catalog:consume-imports
                            {--once : Process a single message and exit}
                            {--sleep=3 : Seconds to sleep when no message is available}';

    protected $description = 'Consume catalog bulk import messages from RabbitMQ';

    public function handle(CatalogImportService $imports): int
    {
        $queues = [
            config('catalog.queues.attacks_import'),
            config('catalog.queues.remediations_import'),
        ];

        $this->info('Listening for catalog imports on queues: '.implode(', ', $queues));

        do {
            /** @var RabbitMQQueue $connection */
            $connection = Queue::connection('rabbitmq');
            $job = null;
            $queueName = null;

            foreach ($queues as $queue) {
                $connection->declareQueue($queue);
                $candidate = $connection->pop($queue);

                if ($candidate !== null) {
                    $job = $candidate;
                    $queueName = $queue;
                    break;
                }
            }

            if ($job === null) {
                if ($this->option('once')) {
                    $this->comment('No messages in catalog import queues.');

                    return self::SUCCESS;
                }

                sleep((int) $this->option('sleep'));

                continue;
            }

            try {
                $payload = json_decode($job->getRawBody(), true, 512, JSON_THROW_ON_ERROR);
                $import = $imports->processMessage($payload);

                $this->info(
                    "Processed catalog import chunk on [{$queueName}] for import [{$import->id}] "
                    ."({$import->processed_rows}/{$import->total_rows}, status {$import->status->value}).",
                );

                $job->delete();
            } catch (Throwable $exception) {
                Log::error('Failed to process catalog import message.', [
                    'queue' => $queueName,
                    'body' => $job instanceof RabbitMQJob ? $job->getRawBody() : null,
                    'exception' => $exception->getMessage(),
                ]);

                $this->error($exception->getMessage());

                if ($job instanceof RabbitMQJob) {
                    $job->release();
                }
            }
        } while (! $this->option('once'));

        return self::SUCCESS;
    }
}
