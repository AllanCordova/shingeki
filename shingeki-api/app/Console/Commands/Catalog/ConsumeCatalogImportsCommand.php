<?php

namespace App\Console\Commands\Catalog;

use App\Services\Catalog\Import\CatalogImportService;
use App\Services\Security\SensitiveDataRedactor;
use App\Support\Queue\ConsumesQueueMessages;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Throwable;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\Jobs\RabbitMQJob;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\RabbitMQQueue;

class ConsumeCatalogImportsCommand extends Command
{
    use ConsumesQueueMessages;

    protected $signature = 'catalog:consume-imports
                            {--once : Process a single message and exit}
                            {--sleep=3 : Seconds to sleep when no message is available}';

    protected $description = 'Consume catalog bulk import messages from RabbitMQ';

    public function handle(CatalogImportService $imports, SensitiveDataRedactor $redactor): int
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
                $summary = ['queue' => $queueName];

                try {
                    $decoded = json_decode($job->getRawBody(), true, 512, JSON_THROW_ON_ERROR);
                    $summary = [
                        ...$summary,
                        ...$redactor->summarizeQueuePayload(is_array($decoded) ? $decoded : []),
                    ];
                } catch (Throwable) {
                    $summary['body_sha256'] = hash('sha256', $job instanceof RabbitMQJob ? $job->getRawBody() : '');
                }

                Log::error('Failed to process catalog import message.', [
                    ...$summary,
                    'exception' => $exception->getMessage(),
                ]);

                $this->error($exception->getMessage());
                $this->releaseOrDrop($job, $exception);
            }
        } while (! $this->option('once'));

        return self::SUCCESS;
    }
}
