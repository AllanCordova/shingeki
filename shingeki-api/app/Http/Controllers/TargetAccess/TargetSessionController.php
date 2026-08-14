<?php

namespace App\Http\Controllers\TargetAccess;

use App\Enums\TargetAccess\TargetAuthType;
use App\Http\Controllers\Controller;
use App\Http\Requests\TargetAccess\StartTargetSessionCapture;
use App\Http\Requests\TargetAccess\StoreTargetSession;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use App\Services\TargetAccess\TargetSession\TargetSessionCaptureService;
use App\Services\TargetAccess\TargetSession\TargetSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TargetSessionController extends Controller
{
    public function __construct(
        private readonly TargetSessionService $targetSessionService,
        private readonly TargetSessionCaptureService $captureService,
    ) {}

    public function show(Request $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('manageTargetSession', $system);

        $session = $this->targetSessionService->findActiveSession($request->user(), $system);

        if ($session === null) {
            return response()->json([
                'connected' => false,
            ]);
        }

        return response()->json([
            'connected' => true,
            'auth_type' => $session->auth_type->value,
            'header_names' => $session->headerNames(),
            'expires_at' => $session->expires_at,
            'updated_at' => $session->updated_at,
        ]);
    }

    public function store(StoreTargetSession $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('manageTargetSession', $system);

        $session = $this->targetSessionService->store(
            $request->user(),
            $system,
            TargetAuthType::from($request->validated('auth_type')),
            $request->validated('credential'),
            $request->date('expires_at'),
        );

        return response()->json([
            'message' => 'Target session imported successfully.',
            'connected' => true,
            'auth_type' => $session->auth_type->value,
            'header_names' => $session->headerNames(),
            'expires_at' => $session->expires_at,
            'updated_at' => $session->updated_at,
        ], 201);
    }

    public function destroy(Request $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('manageTargetSession', $system);

        $removed = $this->targetSessionService->revoke($request->user(), $system);

        if (! $removed) {
            return response()->json([
                'message' => 'No target session found for this system.',
            ], 404);
        }

        return response()->json([
            'message' => 'Target session removed successfully.',
        ]);
    }

    public function connectStart(
        StartTargetSessionCapture $request,
        Project $project,
        System $system,
    ): JsonResponse {
        $this->authorize('manageTargetSession', $system);

        $payload = $this->captureService->start(
            $request->user(),
            $system,
            $request->validated('client_origin'),
        );

        return response()->json([
            'message' => 'Target session capture started.',
            ...$payload,
        ]);
    }
}
