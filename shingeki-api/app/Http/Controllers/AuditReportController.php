<?php

namespace App\Http\Controllers;

use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\System;
use App\Services\Audit\AuditReportDataBuilder;
use App\Services\Audit\AuditReportPdfGenerator;
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
