<?php

namespace App\Services\Scanning\Audit;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class AuditReportPdfGenerator
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function download(array $data): Response
    {
        $dispatchId = (string) ($data['dispatch']['id'] ?? 'dispatch');
        $shortId = substr($dispatchId, 0, 8);
        $date = now()->format('Y-m-d');
        $filename = "shingeki-relatorio-auditoria-{$date}-{$shortId}.pdf";

        $pdf = Pdf::loadView('reports.audit-dispatch', $data)
            ->setPaper('a4', 'portrait');

        return $pdf->download($filename);
    }
}
