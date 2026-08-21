<?php

namespace App\Http\Controllers\Attack;

use App\Http\Controllers\Controller;
use App\Models\Attack\Attack;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Services\Attack\AttackAcknowledgmentService;
use App\Support\AttackAcknowledgmentTerms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttackAcknowledgmentController extends Controller
{
    public function __construct(
        private readonly AttackAcknowledgmentService $acknowledgments,
    ) {}

    public function show(Request $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('create', [Attack::class, $system]);

        $latest = $this->acknowledgments->latestCurrentAcknowledgment(
            $request->user(),
            $system,
        );

        return response()->json([
            'acknowledged' => $latest !== null,
            'acknowledged_at' => $latest?->acknowledged_at?->toISOString(),
            'terms' => AttackAcknowledgmentTerms::payload(),
        ]);
    }
}
