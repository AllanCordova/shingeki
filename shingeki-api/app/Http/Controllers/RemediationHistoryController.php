<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\System;
use App\Services\Remediation\RemediationHistoryService;
use Illuminate\Http\JsonResponse;

class RemediationHistoryController extends Controller
{
    public function __construct(
        private readonly RemediationHistoryService $history,
    ) {}

    public function index(Project $project, System $system): JsonResponse
    {
        $this->authorize('view', $system);

        return response()->json([
            'events' => $this->history->timelineForSystem($system),
        ]);
    }
}
