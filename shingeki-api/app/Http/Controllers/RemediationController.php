<?php

namespace App\Http\Controllers;

use App\Http\Requests\RemediateSystem;
use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\System;
use App\Models\SystemResult;
use App\Services\Remediation\RemediationResolver;
use Illuminate\Http\JsonResponse;

class RemediationController extends Controller
{
    public function __construct(
        private readonly RemediationResolver $remediationResolver,
    ) {}

    public function remediate(RemediateSystem $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('remediate', $system);

        $system->load('stacks');

        if ($system->stacks->isEmpty()) {
            return response()->json([
                'message' => 'Configure at least one technology stack on the system before remediating.',
            ], 422);
        }

        $dispatch = $this->resolveDispatch($system, $request->validated('dispatch_id'));

        if ($dispatch === null) {
            return response()->json([
                'message' => 'No completed attack dispatch is available to remediate.',
            ], 422);
        }

        $results = SystemResult::query()
            ->with(['attack', 'attackDispatch'])
            ->where('system_id', $system->id)
            ->where('attack_dispatch_id', $dispatch->id)
            ->latest()
            ->get();

        if ($results->isEmpty()) {
            return response()->json([
                'message' => 'No findings are available to remediate for the selected dispatch.',
            ], 422);
        }

        $findings = $results
            ->map(fn (SystemResult $result) => $this->formatFinding($result, $system))
            ->values()
            ->all();

        return response()->json([
            'message' => 'Remediation suggestions generated.',
            'system_id' => $system->id,
            'dispatch_id' => $dispatch->id,
            'stacks' => $system->stacks
                ->map(fn ($stack) => [
                    'id' => $stack->id,
                    'slug' => $stack->slug,
                    'name' => $stack->name,
                ])
                ->values()
                ->all(),
            'findings_count' => count($findings),
            'findings' => $findings,
        ]);
    }

    private function resolveDispatch(System $system, ?string $dispatchId): ?AttackDispatch
    {
        if (is_string($dispatchId)) {
            return AttackDispatch::query()
                ->where('system_id', $system->id)
                ->whereKey($dispatchId)
                ->first();
        }

        return AttackDispatch::query()
            ->where('system_id', $system->id)
            ->whereNotNull('completed_at')
            ->latest('dispatched_at')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function formatFinding(SystemResult $result, System $system): array
    {
        $data = [
            'system_result_id' => $result->id,
            'attack_dispatch_id' => $result->attack_dispatch_id,
            'scan_type' => $result->attackDispatch?->scan_type?->value,
            'vulnerable_route' => $result->vulnerable_route,
            'payload_used' => $result->payload_used,
            'evidence' => $result->evidence,
            'http_request' => $result->http_request,
            'remediations' => $this->remediationResolver->resolveForResult($result, $system->stacks),
        ];

        if ($result->attack !== null) {
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
