<?php

namespace App\Http\Controllers\Scanning\Concerns;

use App\Http\Requests\Scanning\ListSystemResultShow;
use App\Models\Scanning\DispatchProbe;
use App\Models\Scanning\SystemResult;
use Illuminate\Database\Eloquent\Builder;

trait AppliesLogSearchFilters
{
    /**
     * @param  Builder<SystemResult>  $query
     */
    protected function applyResultLogFilters(Builder $query, ListSystemResultShow $request): void
    {
        if ($request->category()) {
            $query->whereHas('attack', fn (Builder $attackQuery) => $attackQuery->where(
                'category',
                $request->category(),
            ));
        }

        if ($request->riskLevel()) {
            $query->whereHas('attack', fn (Builder $attackQuery) => $attackQuery->where(
                'risk_level',
                $request->riskLevel(),
            ));
        }

        if ($request->routeQuery()) {
            $needle = '%'.$request->routeQuery().'%';
            $query->where(function (Builder $inner) use ($needle) {
                $inner->where('vulnerable_route', 'like', $needle)
                    ->orWhere('source_file', 'like', $needle);
            });
        }

        if ($request->searchQuery()) {
            $needle = '%'.$request->searchQuery().'%';
            $query->where(function (Builder $inner) use ($needle) {
                $inner->where('payload_used', 'like', $needle)
                    ->orWhere('evidence', 'like', $needle)
                    ->orWhere('matched_snippet', 'like', $needle);
            });
        }
    }

    /**
     * @param  Builder<DispatchProbe>  $query
     */
    protected function applyProbeLogFilters(Builder $query, ListSystemResultShow $request): void
    {
        if ($request->category()) {
            $query->whereHas('attack', fn (Builder $attackQuery) => $attackQuery->where(
                'category',
                $request->category(),
            ));
        }

        if ($request->riskLevel()) {
            $query->whereHas('attack', fn (Builder $attackQuery) => $attackQuery->where(
                'risk_level',
                $request->riskLevel(),
            ));
        }

        if ($request->routeQuery()) {
            $needle = '%'.$request->routeQuery().'%';
            $query->where('route', 'like', $needle);
        }

        if ($request->searchQuery()) {
            $needle = '%'.$request->searchQuery().'%';
            $query->where(function (Builder $inner) use ($needle) {
                $inner->where('payload_used', 'like', $needle)
                    ->orWhere('evidence', 'like', $needle);
            });
        }
    }
}
