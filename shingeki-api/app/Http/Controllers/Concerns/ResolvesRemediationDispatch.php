<?php

namespace App\Http\Controllers\Concerns;

use App\Models\AttackDispatch;
use App\Models\System;
use App\Models\SystemResult;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

trait ResolvesRemediationDispatch
{
    protected function resolveDispatch(System $system, ?string $dispatchId): ?AttackDispatch
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

    protected function paginatedDispatchResults(
        System $system,
        AttackDispatch $dispatch,
        int $page,
        int $perPage,
    ): LengthAwarePaginator {
        return SystemResult::query()
            ->with(['attack', 'attackDispatch'])
            ->where('system_id', $system->id)
            ->where('attack_dispatch_id', $dispatch->id)
            ->latest()
            ->paginate(perPage: $perPage, page: $page);
    }

    protected function formatSystemStacks(System $system): array
    {
        return $system->stacks
            ->map(fn ($stack) => [
                'id' => $stack->id,
                'slug' => $stack->slug,
                'name' => $stack->name,
            ])
            ->values()
            ->all();
    }

    protected function emptyStacksResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'Configure at least one technology stack on the system before remediating.',
        ], 422);
    }

    protected function missingDispatchResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'No completed attack dispatch is available to remediate.',
        ], 422);
    }

    protected function emptyFindingsResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'No findings are available to remediate for the selected dispatch.',
        ], 422);
    }
}
