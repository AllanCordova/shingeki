<?php

namespace App\Http\Controllers\Catalog;

use App\Enums\Catalog\CatalogImportType;
use App\Http\Controllers\Controller;
use App\Services\CatalogImport\CatalogImportService;
use App\Services\CatalogImport\CatalogImportTemplateBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CatalogAttackImportController extends Controller
{
    public function __construct(
        private readonly CatalogImportService $imports,
        private readonly CatalogImportTemplateBuilder $templates,
    ) {}

    public function template(): StreamedResponse
    {
        $this->authorize('bulkImportCatalog');

        return $this->csvResponse(
            $this->templates->filename(CatalogImportType::Attacks),
            $this->templates->attacksCsv(),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('bulkImportCatalog');

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        try {
            $result = $this->imports->queueAttackImport(
                $request->user(),
                $request->file('file'),
            );
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        if ($result['validation_errors'] !== []) {
            return response()->json([
                'message' => 'Spreadsheet validation failed.',
                'import' => $this->imports->formatImport($result['import']),
                'validation_errors' => $result['validation_errors'],
            ], 422);
        }

        return response()->json([
            'message' => 'Attack catalog import queued for processing.',
            'import' => $this->imports->formatImport($result['import']),
        ], 202);
    }

    private function csvResponse(string $filename, string $contents): StreamedResponse
    {
        return response()->streamDownload(
            static function () use ($contents): void {
                echo $contents;
            },
            $filename,
            ['Content-Type' => 'text/csv; charset=UTF-8'],
        );
    }
}
