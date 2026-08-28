<?php

namespace App\Services\CatalogImport;

use App\Enums\Catalog\CatalogImportType;
use App\Models\Catalog\CatalogImport;
use App\Models\User\User;
use Illuminate\Support\Facades\Queue;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\RabbitMQQueue;

class CatalogImportQueuePublisher
{
    /**
     * @param  list<array<string, mixed>>  $rows
     */
    public function publish(CatalogImport $import, User $user, CatalogImportType $type, array $rows): void
    {
        $connection = $this->connection();
        $queue = $this->queueFor($type);
        $connection->declareQueue($queue);

        $chunkSize = max(1, (int) config('catalog.import.chunk_size'));
        $chunks = array_chunk($rows, $chunkSize);
        $chunkTotal = count($chunks);

        foreach ($chunks as $index => $items) {
            $payload = [
                'event' => $this->eventFor($type),
                'import_id' => $import->id,
                'user_id' => $user->id,
                'items' => $items,
                'chunk_index' => $index,
                'chunk_total' => $chunkTotal,
                'queued_at' => now()->toIso8601String(),
            ];

            $connection->pushRaw(json_encode($payload, JSON_THROW_ON_ERROR), $queue);
        }
    }

    private function queueFor(CatalogImportType $type): string
    {
        return match ($type) {
            CatalogImportType::Attacks => config('catalog.queues.attacks_import'),
            CatalogImportType::Remediations => config('catalog.queues.remediations_import'),
        };
    }

    private function eventFor(CatalogImportType $type): string
    {
        return match ($type) {
            CatalogImportType::Attacks => 'catalog.attacks.import.batch',
            CatalogImportType::Remediations => 'catalog.remediations.import.batch',
        };
    }

    private function connection(): RabbitMQQueue
    {
        /** @var RabbitMQQueue $connection */
        $connection = Queue::connection('rabbitmq');

        return $connection;
    }
}
