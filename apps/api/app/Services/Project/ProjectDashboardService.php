<?php

namespace App\Services\Project;

use App\Models\Attack\AttackDispatch;
use App\Models\Project\Project;
use Illuminate\Support\Collection;

class ProjectDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function build(Project $project): array
    {
        $systems = $project->systems()->get(['id', 'name']);
        $systemIds = $systems->pluck('id');

        $completedBySystem = $this->completedDispatchesGroupedBySystem($systemIds);
        $latestBySystem = $completedBySystem->map(
            fn (Collection $group) => $group->first(),
        )->filter();
        $previousBySystem = $completedBySystem->map(
            fn (Collection $group) => $group->get(1),
        );

        $totalFindings = $latestBySystem->sum(fn (AttackDispatch $dispatch) => $dispatch->findings_count ?? 0);
        $previousTotalFindings = $previousBySystem->sum(fn (?AttackDispatch $dispatch) => $dispatch?->findings_count ?? 0);
        $trend = $totalFindings - $previousTotalFindings;

        $lastDispatch = AttackDispatch::query()
            ->whereIn('system_id', $systemIds)
            ->latest('dispatched_at')
            ->with('system:id,name,project_id')
            ->first();

        $systemsWithFindings = $latestBySystem
            ->filter(fn (AttackDispatch $dispatch) => ($dispatch->findings_count ?? 0) > 0)
            ->map(function (AttackDispatch $dispatch) use ($systems) {
                $system = $systems->firstWhere('id', $dispatch->system_id);

                return [
                    'system_id' => $dispatch->system_id,
                    'system_name' => $system?->name,
                    'findings_count' => $dispatch->findings_count ?? 0,
                    'dispatch_id' => $dispatch->id,
                    'dispatched_at' => $dispatch->dispatched_at,
                ];
            })
            ->values()
            ->all();

        return [
            'systems_count' => $systems->count(),
            'total_findings' => $totalFindings,
            'previous_total_findings' => $previousTotalFindings,
            'findings_trend' => $trend,
            'trend_direction' => $trend > 0 ? 'up' : ($trend < 0 ? 'down' : 'flat'),
            'last_dispatch' => $lastDispatch ? $this->formatDispatchSummary($lastDispatch) : null,
            'systems_with_findings' => $systemsWithFindings,
        ];
    }

    /**
     * @param  Collection<int, string>  $systemIds
     * @return Collection<string, Collection<int, AttackDispatch>>
     */
    private function completedDispatchesGroupedBySystem(Collection $systemIds): Collection
    {
        if ($systemIds->isEmpty()) {
            return collect();
        }

        return AttackDispatch::query()
            ->whereIn('system_id', $systemIds)
            ->whereNotNull('completed_at')
            ->orderByDesc('dispatched_at')
            ->get()
            ->groupBy('system_id');
    }

    /**
     * @return array<string, mixed>
     */
    private function formatDispatchSummary(AttackDispatch $dispatch): array
    {
        $dispatch->loadMissing('system:id,name');

        return [
            'id' => $dispatch->id,
            'system_id' => $dispatch->system_id,
            'system_name' => $dispatch->system?->name,
            'scan_type' => $dispatch->scan_type->value,
            'status' => $dispatch->scanStatus(),
            'dispatched_at' => $dispatch->dispatched_at,
            'findings_count' => $dispatch->findings_count,
            'attacks_count' => $dispatch->attacks_count,
        ];
    }
}
