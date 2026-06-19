<?php

namespace App\Http\Controllers;

use App\Enums\AttackScanType;
use App\Http\Requests\AttackDispatch as AttackDispatchRequest;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\System;
use App\Services\Attack\AttackCatalogService;
use App\Services\Attack\AttackQueuePublisher;
use App\Services\Signature\SignatureAuthorizationService;
use App\Services\TargetSession\TargetSessionService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class AttackController extends Controller
{
    public function __construct(
        private readonly SignatureAuthorizationService $signatureAuthorization,
        private readonly AttackCatalogService $attackCatalog,
        private readonly AttackQueuePublisher $attackQueuePublisher,
        private readonly TargetSessionService $targetSessionService,
    ) {}

    public function dispatch(AttackDispatchRequest $request, Project $project, System $system): JsonResponse
    {
        return $this->dispatchScan($request, $project, $system, AttackScanType::Dast);
    }

    public function dispatchSast(AttackDispatchRequest $request, Project $project, System $system): JsonResponse
    {
        if (blank($system->repository_url)) {
            return response()->json([
                'message' => 'System repository_url is required for SAST dispatch.',
            ], 422);
        }

        return $this->dispatchScan($request, $project, $system, AttackScanType::Sast);
    }

    private function dispatchScan(
        AttackDispatchRequest $request,
        Project $project,
        System $system,
        AttackScanType $scanType,
    ): JsonResponse {
        $this->authorize('create', [Attack::class, $system]);

        try {
            $this->signatureAuthorization->assertPermittedForSystem(
                $request->user(),
                $system,
            );
        } catch (AuthorizationException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 403);
        }

        try {
            $attacks = $this->attackCatalog->catalogAttacksOrFail($scanType);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        $dispatch = AttackDispatch::create([
            'system_id' => $system->id,
            'user_id' => $request->user()->id,
            'scan_type' => $scanType,
            'attacks_count' => $attacks->count(),
            'dispatched_at' => now(),
        ]);

        $this->attackQueuePublisher->publishDispatchBatch(
            $dispatch,
            $system,
            $request->user(),
            $attacks,
            $scanType,
            $this->targetSessionService->resolveQueueAuth($request->user(), $system),
        );

        $scanLabel = $scanType === AttackScanType::Sast ? 'SAST' : 'DAST';
        $targetSession = $this->targetSessionService->findActiveSession($request->user(), $system);

        return response()->json([
            'message' => "{$scanLabel} attack catalog dispatched to processing queue.",
            'dispatch' => $this->formatDispatch($dispatch),
            'attacks_count' => $attacks->count(),
            'attacks' => $attacks->map(fn (Attack $attack) => $this->formatAttack($attack)),
            'target_session_connected' => $targetSession !== null,
        ], 202);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatDispatch(AttackDispatch $dispatch): array
    {
        return [
            'id' => $dispatch->id,
            'system_id' => $dispatch->system_id,
            'user_id' => $dispatch->user_id,
            'scan_type' => $dispatch->scan_type->value,
            'attacks_count' => $dispatch->attacks_count,
            'dispatched_at' => $dispatch->dispatched_at,
            'completed_at' => $dispatch->completed_at,
            'duration_ms' => $dispatch->duration_ms,
            'findings_count' => $dispatch->findings_count,
            'status' => $dispatch->completed_at === null ? 'pending' : 'completed',
            'created_at' => $dispatch->created_at,
            'updated_at' => $dispatch->updated_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatAttack(Attack $attack): array
    {
        return [
            'id' => $attack->id,
            'user_id' => $attack->user_id,
            'scan_type' => $attack->scan_type->value,
            'category' => $attack->category->value,
            'target_location' => $attack->target_location->value,
            'risk_level' => $attack->risk_level->value,
            'payload' => $attack->payload,
            'created_at' => $attack->created_at,
            'updated_at' => $attack->updated_at,
        ];
    }
}
