<?php

namespace App\Services\Scanning\Audit;

use App\Enums\Scanning\AttackScanType;
use App\Models\Scanning\AttackDispatch;
use App\Models\Scanning\DispatchProbe;
use App\Models\Scanning\SystemResult;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use App\Services\Remediation\Source\SourceFileNormalizer;
use Illuminate\Support\Collection;

class AuditReportDataBuilder
{
    /**
     * @return array<string, mixed>
     */
    public function build(Project $project, System $system, AttackDispatch $dispatch): array
    {
        $dispatch->loadMissing('user');

        $findings = SystemResult::query()
            ->with('attack')
            ->where('attack_dispatch_id', $dispatch->id)
            ->latest()
            ->get();

        $probeCounts = $dispatch->scan_type === AttackScanType::Dast
            ? $this->probeOutcomeCounts($dispatch)
            : null;

        return [
            'generated_at' => now(),
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
            'system' => [
                'id' => $system->id,
                'name' => $system->name,
                'target_url' => $system->target_url,
                'repository_url' => $system->repository_url,
            ],
            'dispatch' => [
                'id' => $dispatch->id,
                'scan_type' => $dispatch->scan_type->value,
                'attacks_count' => $dispatch->attacks_count,
                'findings_count' => $dispatch->findings_count,
                'probes_count' => $dispatch->probes_count,
                'vectors_discovered' => $dispatch->vectors_discovered,
                'jobs_planned' => $dispatch->jobs_planned,
                'dispatched_at' => $dispatch->dispatched_at,
                'completed_at' => $dispatch->completed_at,
                'duration_ms' => $dispatch->duration_ms,
                'duration_label' => $this->formatDuration($dispatch->duration_ms),
            ],
            'executed_by' => [
                'name' => $dispatch->user?->name,
                'email' => $dispatch->user?->email,
            ],
            'findings' => $findings
                ->map(fn (SystemResult $result) => $this->formatFinding($result, $dispatch->scan_type))
                ->values()
                ->all(),
            'risk_summary' => $this->riskSummary($findings),
            'probe_counts' => $probeCounts,
            'detail_url' => $this->detailUrl($project, $system, $dispatch),
            'is_dast' => $dispatch->scan_type === AttackScanType::Dast,
            'is_sast' => $dispatch->scan_type === AttackScanType::Sast,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatFinding(SystemResult $result, AttackScanType $scanType): array
    {
        $locationFields = SourceFileNormalizer::formatForApi(
            $result->source_file,
            $result->start_line,
            $result->end_line,
            $result->vulnerable_route,
        );

        $isSast = $scanType === AttackScanType::Sast;

        return [
            'category' => $result->attack?->category->value ?? 'Vulnerabilidade',
            'risk_level' => $result->attack?->risk_level->value,
            'target_location' => $result->attack?->target_location->value,
            'vulnerable_route' => $result->vulnerable_route,
            'payload_used' => $result->payload_used,
            'evidence' => $result->evidence,
            'http_request' => $result->http_request,
            'matched_snippet' => $result->matched_snippet,
            'source_location' => $locationFields['source_location'] ?? null,
            'is_sast' => $isSast,
            'location_label' => $isSast ? 'Arquivo e linha(s)' : 'Localização',
            'payload_label' => $isSast ? 'Regra Semgrep' : 'Payload',
            'http_label' => $isSast ? 'Contexto' : 'Requisição HTTP',
        ];
    }

    /**
     * @param  Collection<int, SystemResult>  $findings
     * @return array<string, int>
     */
    private function riskSummary(Collection $findings): array
    {
        $summary = [
            'HIGH' => 0,
            'MEDIUM' => 0,
            'LOW' => 0,
            'UNKNOWN' => 0,
        ];

        foreach ($findings as $finding) {
            $risk = $finding->attack?->risk_level->value ?? 'UNKNOWN';
            $summary[$risk] = ($summary[$risk] ?? 0) + 1;
        }

        return $summary;
    }

    /**
     * @return array{all: int, vulnerable: int, clean: int, error: int}|null
     */
    private function probeOutcomeCounts(AttackDispatch $dispatch): array
    {
        $query = DispatchProbe::query()
            ->where('attack_dispatch_id', $dispatch->id);

        $row = (clone $query)
            ->selectRaw('COUNT(*) as aggregate_all')
            ->selectRaw("SUM(CASE WHEN outcome = 'vulnerable' THEN 1 ELSE 0 END) as aggregate_vulnerable")
            ->selectRaw("SUM(CASE WHEN outcome = 'clean' THEN 1 ELSE 0 END) as aggregate_clean")
            ->selectRaw("SUM(CASE WHEN outcome = 'error' THEN 1 ELSE 0 END) as aggregate_error")
            ->first();

        return [
            'all' => (int) ($row?->aggregate_all ?? 0),
            'vulnerable' => (int) ($row?->aggregate_vulnerable ?? 0),
            'clean' => (int) ($row?->aggregate_clean ?? 0),
            'error' => (int) ($row?->aggregate_error ?? 0),
        ];
    }

    private function detailUrl(Project $project, System $system, AttackDispatch $dispatch): string
    {
        $base = config('frontend.url');

        return sprintf(
            '%s/projetos/%s/sistemas/%s/resultados/%s',
            $base,
            $project->id,
            $system->id,
            $dispatch->id,
        );
    }

    private function formatDuration(?int $durationMs): ?string
    {
        if ($durationMs === null || $durationMs < 0) {
            return null;
        }

        if ($durationMs < 1000) {
            return "{$durationMs} ms";
        }

        $seconds = intdiv($durationMs, 1000);
        $minutes = intdiv($seconds, 60);
        $remainingSeconds = $seconds % 60;

        if ($minutes === 0) {
            return "{$remainingSeconds}s";
        }

        return "{$minutes}m {$remainingSeconds}s";
    }
}
