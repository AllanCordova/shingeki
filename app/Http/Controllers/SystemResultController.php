<?php

namespace App\Http\Controllers;

use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\System;
use App\Models\SystemResult;
use Illuminate\Http\JsonResponse;

class SystemResultController extends Controller
{
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

    public function show(Project $project, System $system, AttackDispatch $attackDispatch): JsonResponse
    {
        $this->authorize('viewBatch', $attackDispatch);

        $results = SystemResult::query()
            ->with('attack')
            ->where('attack_dispatch_id', $attackDispatch->id)
            ->latest()
            ->get();

        return response()->json([
            'dispatch' => $this->formatDispatch($attackDispatch),
            'results' => $results
                ->map(fn (SystemResult $result) => $this->formatResult($result))
                ->values()
                ->all(),
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
            'attacks_count' => $dispatch->attacks_count,
            'dispatched_at' => $dispatch->dispatched_at,
            'completed_at' => $dispatch->completed_at,
            'duration_ms' => $dispatch->duration_ms,
            'findings_count' => $dispatch->findings_count,
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
        $data = [
            'id' => $result->id,
            'system_id' => $result->system_id,
            'attack_dispatch_id' => $result->attack_dispatch_id,
            'attack_id' => $result->attack_id,
            'vulnerable_route' => $result->vulnerable_route,
            'payload_used' => $result->payload_used,
            'evidence' => $result->evidence,
            'http_request' => $result->http_request,
            'created_at' => $result->created_at,
            'updated_at' => $result->updated_at,
        ];

        if ($result->relationLoaded('attack') && $result->attack !== null) {
            $data['attack'] = [
                'id' => $result->attack->id,
                'category' => $result->attack->category->value,
                'target_location' => $result->attack->target_location->value,
                'risk_level' => $result->attack->risk_level->value,
            ];
        }

        return $data;
    }
}
