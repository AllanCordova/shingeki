<?php

namespace App\Services\CatalogImport;

use App\Enums\CatalogImportStatus;
use App\Enums\CatalogImportType;
use App\Models\Attack;
use App\Models\CatalogImport;
use App\Models\Remediation;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CatalogImportService
{
    public function __construct(
        private readonly AttackSpreadsheetParser $attackParser,
        private readonly RemediationSpreadsheetParser $remediationParser,
        private readonly CatalogImportQueuePublisher $publisher,
    ) {}

    /**
     * @return array{import: CatalogImport, validation_errors: list<array{row: int, messages: list<string>}>}
     */
    public function queueAttackImport(User $user, UploadedFile $file): array
    {
        return $this->queueImport($user, $file, CatalogImportType::Attacks);
    }

    /**
     * @return array{import: CatalogImport, validation_errors: list<array{row: int, messages: list<string>}>}
     */
    public function queueRemediationImport(User $user, UploadedFile $file): array
    {
        return $this->queueImport($user, $file, CatalogImportType::Remediations);
    }

    /**
     * @return array{import: CatalogImport, validation_errors: list<array{row: int, messages: list<string>}>}
     */
    private function queueImport(User $user, UploadedFile $file, CatalogImportType $type): array
    {
        $parsed = $type === CatalogImportType::Attacks
            ? $this->attackParser->parse($file)
            : $this->remediationParser->parse($file);

        if ($parsed['errors'] !== []) {
            return [
                'import' => $this->createFailedImport($user, $type, count($parsed['rows']), $parsed['errors']),
                'validation_errors' => $parsed['errors'],
            ];
        }

        if ($parsed['rows'] === []) {
            throw new RuntimeException('Spreadsheet has no data rows.');
        }

        $import = CatalogImport::create([
            'user_id' => $user->id,
            'type' => $type,
            'status' => CatalogImportStatus::Pending,
            'total_rows' => count($parsed['rows']),
        ]);

        $this->publisher->publish($import, $user, $type, $parsed['rows']);

        return [
            'import' => $import->fresh(),
            'validation_errors' => [],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function processMessage(array $payload): CatalogImport
    {
        $import = CatalogImport::query()->findOrFail($payload['import_id']);
        $userId = (string) $payload['user_id'];
        /** @var list<array<string, mixed>> $items */
        $items = $payload['items'] ?? [];
        $chunkIndex = (int) ($payload['chunk_index'] ?? 0);
        $chunkTotal = max(1, (int) ($payload['chunk_total'] ?? 1));
        $isLastChunk = $chunkIndex >= ($chunkTotal - 1);

        return DB::transaction(function () use ($import, $userId, $items, $isLastChunk): CatalogImport {
            if ($import->status === CatalogImportStatus::Pending) {
                $import->update([
                    'status' => CatalogImportStatus::Processing,
                    'started_at' => now(),
                ]);
            }

            $success = 0;
            $failed = 0;
            $errors = $import->row_errors ?? [];

            foreach ($items as $item) {
                try {
                    if ($import->type === CatalogImportType::Attacks) {
                        Attack::create([
                            ...$item,
                            'user_id' => $userId,
                        ]);
                    } else {
                        Remediation::create([
                            ...$item,
                            'user_id' => $userId,
                        ]);
                    }

                    $success++;
                } catch (\Throwable $exception) {
                    $failed++;
                    $errors[] = [
                        'row' => null,
                        'messages' => [$exception->getMessage()],
                    ];
                }
            }

            $import->update([
                'processed_rows' => $import->processed_rows + count($items),
                'success_count' => $import->success_count + $success,
                'failed_count' => $import->failed_count + $failed,
                'row_errors' => $errors === [] ? null : $errors,
                'status' => $isLastChunk
                    ? ($failed > 0 && $success === 0 ? CatalogImportStatus::Failed : CatalogImportStatus::Completed)
                    : CatalogImportStatus::Processing,
                'completed_at' => $isLastChunk ? now() : $import->completed_at,
            ]);

            return $import->fresh();
        });
    }

    /**
     * @param  list<array{row: int, messages: list<string>}>  $errors
     */
    private function createFailedImport(User $user, CatalogImportType $type, int $totalRows, array $errors): CatalogImport
    {
        return CatalogImport::create([
            'user_id' => $user->id,
            'type' => $type,
            'status' => CatalogImportStatus::Failed,
            'total_rows' => $totalRows,
            'processed_rows' => 0,
            'success_count' => 0,
            'failed_count' => count($errors),
            'row_errors' => $errors,
            'completed_at' => now(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatImport(CatalogImport $import): array
    {
        return [
            'id' => $import->id,
            'type' => $import->type->value,
            'status' => $import->status->value,
            'total_rows' => $import->total_rows,
            'processed_rows' => $import->processed_rows,
            'success_count' => $import->success_count,
            'failed_count' => $import->failed_count,
            'row_errors' => $import->row_errors ?? [],
            'started_at' => $import->started_at,
            'completed_at' => $import->completed_at,
            'created_at' => $import->created_at,
            'updated_at' => $import->updated_at,
        ];
    }
}
