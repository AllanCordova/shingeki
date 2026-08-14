<?php

namespace App\Http\Controllers\Catalog\Concerns;

use App\Enums\Catalog\CatalogImportType;
use App\Services\Catalog\Import\CatalogImportService;
use App\Services\Catalog\Import\CatalogImportTemplateBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

trait HandlesCatalogImport
{
    private function streamCatalogTemplate(CatalogImportType $type): StreamedResponse
    {
        $this->authorize('bulkImportCatalog');

        $contents = $type === CatalogImportType::Attacks
            ? $this->templates()->attacksCsv()
            : $this->templates()->remediationsCsv();

        $filename = $this->templates()->filename($type);

        return response()->streamDownload(
            static function () use ($contents): void {
                echo $contents;
            },
            $filename,
            ['Content-Type' => 'text/csv; charset=UTF-8'],
        );
    }

    private function queueCatalogImport(Request $request, CatalogImportType $type): JsonResponse
    {
        $this->authorize('bulkImportCatalog');

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        try {
            $result = $type === CatalogImportType::Attacks
                ? $this->imports()->queueAttackImport($request->user(), $request->file('file'))
                : $this->imports()->queueRemediationImport($request->user(), $request->file('file'));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        if ($result['validation_errors'] !== []) {
            return response()->json([
                'message' => 'Spreadsheet validation failed.',
                'import' => $this->imports()->formatImport($result['import']),
                'validation_errors' => $result['validation_errors'],
            ], 422);
        }

        $queued = $type === CatalogImportType::Attacks
            ? 'Attack catalog import queued for processing.'
            : 'Remediation catalog import queued for processing.';

        return response()->json([
            'message' => $queued,
            'import' => $this->imports()->formatImport($result['import']),
        ], 202);
    }

    abstract protected function imports(): CatalogImportService;

    abstract protected function templates(): CatalogImportTemplateBuilder;
}
