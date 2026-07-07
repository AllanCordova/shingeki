<?php

namespace App\Http\Controllers;

use App\Enums\DispatchProbeOutcome;
use App\Enums\DispatchProbeListFilter;
use App\Http\Controllers\Concerns\FormatsPagination;
use App\Http\Requests\ListSystemResultShow;
use App\Models\AttackDispatch;
use App\Models\DispatchProbe;
use App\Models\Project;
use App\Models\System;
use App\Models\SystemResult;
use App\Services\Source\SourceFileNormalizer;
use Illuminate\Http\JsonResponse;

class SystemResultController extends Controller
{
    use FormatsPagination;

    public function index(Project $project, System $system): JsonResponse
    {
        $this->authorize('viewAny', [SystemResult::class, $system]);

        $dispatches = AttackDispatch::query()
            ->where('system_id', $system->id)
            ->latest('dispatched_at')
            ->get();

        return response()->json([
            'dispatches' => $dispatches
                ->map(fn (AttackDispatch $dispatch) => $this->formatDispatch($dispatch))
                ->values()
                ->all(),
        ]);
    }

    public function show(ListSystemResultShow $request, Project $project, System $system, AttackDispatch $attackDispatch): JsonResponse
    {
        $this->authorize('viewBatch', $attackDispatch);

        $results = SystemResult::query()
            ->with('attack')
            ->where('attack_dispatch_id', $attackDispatch->id)
            ->latest()
            ->paginate(
                perPage: $request->resultsPerPage(),
                page: $request->resultsPage(),
            );

        $probeBaseQuery = DispatchProbe::query()
            ->where('attack_dispatch_id', $attackDispatch->id);

        $probeCounts = $this->probeOutcomeCounts($probeBaseQuery);

        $probesQuery = (clone $probeBaseQuery)
            ->with('attack')
            ->latest();

        $this->applyProbeFilter($probesQuery, $request->filter());

        $probes = $probesQuery
            ->paginate(
                perPage: $request->perPage(),
                page: $request->page(),
            );

        return response()->json([
            'dispatch' => $this->formatDispatch($attackDispatch),
            'results' => collect($results->items())
                ->map(fn (SystemResult $result) => $this->formatResult($result))
                ->values()
                ->all(),
            'results_pagination' => $this->formatPagination($results),
            'probes' => collect($probes->items())
                ->map(fn (DispatchProbe $probe) => $this->formatProbe($probe))
                ->values()
                ->all(),
            'probes_pagination' => $this->formatPagination($probes),
            'probe_counts' => $probeCounts,
            'filter' => $request->filter()->value,
        ]);
    }

    public function destroy(Project $project, System $system, AttackDispatch $attackDispatch): JsonResponse
    {
        $this->authorize('deleteBatch', $attackDispatch);

        $attackDispatch->systemResults()->delete();
        $attackDispatch->dispatchProbes()->delete();
        $attackDispatch->delete();

        return response()->json([
            'message' => 'Attack dispatch deleted successfully.',
        ]);
    }

    public function deleteAll(Project $project, System $system): JsonResponse
    {
        $this->authorize('deleteAny', [SystemResult::class, $system]);

        SystemResult::query()
            ->where('system_id', $system->id)
            ->delete();

        DispatchProbe::query()
            ->where('system_id', $system->id)
            ->delete();

        AttackDispatch::query()
            ->where('system_id', $system->id)
            ->delete();

        return response()->json([
            'message' => 'All attack dispatches deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatDispatch(AttackDispatch $dispatch): array
    {
        return [
            'id' => $dispatch->id,
            'system_id' => $dispatch->system_id,
            'user_id' => $dispatch->user_id,
            'scan_type' => $dispatch->scan_type->value,
            'attacks_count' => $dispatch->attacks_count,
            'dispatched_at' => $dispatch->dispatched_at,
            'completed_at' => $dispatch->completed_at,
            'duration_ms' => $dispatch->duration_ms,
            'findings_count' => $dispatch->findings_count,
            'probes_count' => $dispatch->probes_count,
            'vectors_discovered' => $dispatch->vectors_discovered,
            'jobs_planned' => $dispatch->jobs_planned,
            'status' => $dispatch->completed_at === null ? 'pending' : 'completed',
            'created_at' => $dispatch->created_at,
            'updated_at' => $dispatch->updated_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatResult(SystemResult $result): array
    {
        $locationFields = SourceFileNormalizer::formatForApi(
            $result->source_file,
            $result->start_line,
            $result->end_line,
            $result->vulnerable_route,
        );

        $data = [
            'id' => $result->id,
            'system_id' => $result->system_id,
            'attack_dispatch_id' => $result->attack_dispatch_id,
            'attack_id' => $result->attack_id,
            'vulnerable_route' => $result->vulnerable_route,
            'payload_used' => $result->payload_used,
            'evidence' => $result->evidence,
            'http_request' => $result->http_request,
            'matched_snippet' => $result->matched_snippet,
            ...$locationFields,
            'created_at' => $result->created_at,
            'updated_at' => $result->updated_at,
        ];

        if ($result->relationLoaded('attack') && $result->attack !== null) {
            $data['attack'] = [
                'id' => $result->attack->id,
                'scan_type' => $result->attack->scan_type->value,
                'category' => $result->attack->category->value,
                'target_location' => $result->attack->target_location->value,
                'risk_level' => $result->attack->risk_level->value,
            ];
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function formatProbe(DispatchProbe $probe): array
    {
        $data = [
            'id' => $probe->id,
            'attack_dispatch_id' => $probe->attack_dispatch_id,
            'system_id' => $probe->system_id,
            'attack_id' => $probe->attack_id,
            'route' => $probe->route,
            'payload_used' => $probe->payload_used,
            'http_request' => $probe->http_request,
            'outcome' => $probe->outcome->value,
            'evidence' => $probe->evidence,
            'error_message' => $probe->error_message,
            'created_at' => $probe->created_at,
            'updated_at' => $probe->updated_at,
        ];

        if ($probe->relationLoaded('attack') && $probe->attack !== null) {
            $data['attack'] = [
                'id' => $probe->attack->id,
                'scan_type' => $probe->attack->scan_type->value,
                'category' => $probe->attack->category->value,
                'target_location' => $probe->attack->target_location->value,
                'risk_level' => $probe->attack->risk_level->value,
            ];
        }

        return $data;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<DispatchProbe>  $query
     */
    private function applyProbeFilter($query, DispatchProbeListFilter $filter): void
    {
        match ($filter) {
            DispatchProbeListFilter::Vulnerable => $query->where(
                'outcome',
                DispatchProbeOutcome::Vulnerable,
            ),
            DispatchProbeListFilter::Clean => $query->where(
                'outcome',
                DispatchProbeOutcome::Clean,
            ),
            DispatchProbeListFilter::All => null,
        };
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<DispatchProbe>  $query
     * @return array{all: int, vulnerable: int, clean: int, error: int}
     */
    private function probeOutcomeCounts($query): array
    {
        return [
            'all' => (clone $query)->count(),
            'vulnerable' => (clone $query)->where('outcome', DispatchProbeOutcome::Vulnerable)->count(),
            'clean' => (clone $query)->where('outcome', DispatchProbeOutcome::Clean)->count(),
            'error' => (clone $query)->where('outcome', DispatchProbeOutcome::Error)->count(),
        ];
    }
}
