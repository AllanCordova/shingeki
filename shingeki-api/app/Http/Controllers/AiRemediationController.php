<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\FormatsPagination;
use App\Http\Controllers\Concerns\ResolvesRemediationDispatch;
use App\Http\Requests\RemediateSystemAi;
use App\Models\Project;
use App\Models\System;
use App\Services\Ai\AiRemediationService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class AiRemediationController extends Controller
{
    use FormatsPagination;
    use ResolvesRemediationDispatch;

    public function __construct(
        private readonly AiRemediationService $aiRemediationService,
    ) {}

    public function remediate(RemediateSystemAi $request, Project $project, System $system): JsonResponse
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

        try {
            $generated = $this->aiRemediationService->generate(
                $system,
                $dispatch,
                collect($results->items()),
                $request->validated('finding_ids'),
                (bool) $request->boolean('regenerate'),
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 503);
        }

        return response()->json([
            'message' => 'AI remediation suggestions generated.',
            'system_id' => $system->id,
            'dispatch_id' => $dispatch->id,
            'provider' => $generated['provider'],
            'model' => $generated['model'],
            'stacks' => $this->formatSystemStacks($system),
            'findings_count' => $results->total(),
            'findings' => $generated['findings'],
            'findings_pagination' => $this->formatPagination($results),
        ]);
    }
}
