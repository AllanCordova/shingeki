<?php

namespace App\Http\Controllers\Remediation;

use App\Http\Controllers\Concerns\FormatsPagination;
use App\Http\Controllers\Controller;
use App\Http\Requests\Remediation\ListRemediationHistory;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Services\Remediation\RemediationHistoryService;
use Illuminate\Http\JsonResponse;

class RemediationHistoryController extends Controller
{
    use FormatsPagination;

    public function __construct(
        private readonly RemediationHistoryService $history,
    ) {}

    public function index(
        ListRemediationHistory $request,
        Project $project,
        System $system,
    ): JsonResponse {
        $this->authorize('view', $system);

        $paginator = $this->history->timelineForSystem(
            $system,
            $request->page(),
            $request->perPage(),
            $request->fromDate(),
            $request->toDate(),
            $request->eventType(),
        );

        return response()->json([
            'events' => $paginator->items(),
            'pagination' => $this->formatPagination($paginator),
        ]);
    }
}
