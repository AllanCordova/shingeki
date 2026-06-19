<?php

namespace App\Http\Controllers;

use App\Http\Requests\RemediateSystemAi;
use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\System;
use App\Models\SystemResult;
use App\Services\Ai\AiRemediationService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class AiRemediationController extends Controller
{
    public function __construct(
        private readonly AiRemediationService $aiRemediationService,
    ) {}

    public function remediate(RemediateSystemAi $request, Project $project, System $system): JsonResponse
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

        try {
            $generated = $this->aiRemediationService->generate(
                $system,
                $dispatch,
                $results,
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
            'stacks' => $system->stacks
                ->map(fn ($stack) => [
                    'id' => $stack->id,
                    'slug' => $stack->slug,
                    'name' => $stack->name,
                ])
                ->values()
                ->all(),
            'findings_count' => count($generated['findings']),
            'findings' => $generated['findings'],
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
}
