<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\FormatsPagination;
use App\Http\Controllers\Concerns\ResolvesRemediationDispatch;
use App\Http\Requests\RemediateSystem;
use App\Models\Project;
use App\Models\System;
use App\Models\SystemResult;
use App\Services\Remediation\RemediationResolver;
use Illuminate\Http\JsonResponse;

class RemediationController extends Controller
{
    use FormatsPagination;
    use ResolvesRemediationDispatch;

    public function __construct(
        private readonly RemediationResolver $remediationResolver,
    ) {}

    public function remediate(RemediateSystem $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('remediate', $system);

        $system->load('stacks');

        if ($system->stacks->isEmpty()) {
            return $this->emptyStacksResponse();
        }

        $dispatch = $this->resolveDispatch($system, $request->validated('dispatch_id'));

        if ($dispatch === null) {
            return $this->missingDispatchResponse();
        }

        $results = $this->paginatedDispatchResults(
            $system,
            $dispatch,
            $request->page(),
            $request->perPage(),
        );

        if ($results->total() === 0) {
            return $this->emptyFindingsResponse();
        }

        $findings = collect($results->items())
            ->map(fn (SystemResult $result) => $this->formatFinding($result, $system))
            ->values()
            ->all();

        return response()->json([
            'message' => 'Remediation suggestions generated.',
            'system_id' => $system->id,
            'dispatch_id' => $dispatch->id,
            'stacks' => $this->formatSystemStacks($system),
            'findings_count' => $results->total(),
            'findings' => $findings,
            'findings_pagination' => $this->formatPagination($results),
        ]);
    }

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
