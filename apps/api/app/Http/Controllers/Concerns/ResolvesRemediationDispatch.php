<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Attack\AttackDispatch;
use App\Models\System\Stack;
use App\Models\System\System;
use App\Models\System\SystemResult;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
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

    /**
     * Systems without a chosen stack still get the language-agnostic catalog.
     *
     * @return Collection<int, Stack>
     */
    protected function stacksForRemediation(System $system): Collection
    {
        if ($system->stacks->isNotEmpty()) {
            return $system->stacks;
        }

        $generic = Stack::query()->where('slug', Stack::GENERIC_SLUG)->first();

        return $generic === null
            ? $system->stacks
            : new Collection([$generic]);
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
            'message' => 'Configure at least one technology stack on the system before opening a pull request.',
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
