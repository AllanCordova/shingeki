<?php

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Models\Catalog\CatalogImport;
use App\Services\CatalogImport\CatalogImportService;
use Illuminate\Http\JsonResponse;

class CatalogImportController extends Controller
{
    public function __construct(
        private readonly CatalogImportService $imports,
    ) {}

    public function show(CatalogImport $import): JsonResponse
    {
        $this->authorize('bulkImportCatalog');

        if ($import->user_id !== request()->user()->id) {
            abort(404);
        }

        return response()->json([
            'import' => $this->imports->formatImport($import),
        ]);
    }
}
