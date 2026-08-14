<?php

namespace App\Http\Controllers\Scanning;

use App\Http\Controllers\Controller;
use App\Models\Scanning\AttackDispatch;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use App\Services\Scanning\Audit\AuditReportDataBuilder;
use App\Services\Scanning\Audit\AuditReportPdfGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class AuditReportController extends Controller
{
    public function __construct(
        private readonly AuditReportDataBuilder $dataBuilder,
        private readonly AuditReportPdfGenerator $pdfGenerator,
    ) {}

    public function export(Project $project, System $system, AttackDispatch $attackDispatch): Response|JsonResponse
    {
        $this->authorize('viewBatch', $attackDispatch);

        if ($attackDispatch->completed_at === null) {
            return response()->json([
                'message' => 'O relatório só pode ser exportado após a conclusão do disparo.',
            ], 422);
        }

        $data = $this->dataBuilder->build($project, $system, $attackDispatch);

        return $this->pdfGenerator->download($data);
    }
}
