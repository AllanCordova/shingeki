<?php

namespace App\Http\Controllers\Attack;

use App\Enums\Attack\AttackDepth;
use App\Enums\Attack\AttackScanType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attack\AttackDispatch as AttackDispatchRequest;
use App\Models\Attack\Attack;
use App\Models\Attack\AttackAcknowledgment;
use App\Models\Attack\AttackDispatch;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Services\Attack\AttackCatalogService;
use App\Services\Attack\AttackQueuePublisher;
use App\Services\Notification\UserNotificationService;
use App\Services\TargetSession\TargetSessionService;
use App\Support\AttackAcknowledgmentTerms;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class AttackController extends Controller
{
    public function __construct(
        private readonly AttackCatalogService $attackCatalog,
        private readonly AttackQueuePublisher $attackQueuePublisher,
        private readonly TargetSessionService $targetSessionService,
        private readonly UserNotificationService $userNotificationService,
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
            $attacks = $this->attackCatalog->catalogAttacksOrFail($scanType);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        $depth = $request->attackDepth();
        $startPath = $request->startPath() ?? $system->dast_start_path;
        $maxRoutes = $request->maxRoutes() ?? $system->dast_max_routes;

        $dispatch = AttackDispatch::create([
            'system_id' => $system->id,
            'user_id' => $request->user()->id,
            'scan_type' => $scanType,
            'depth' => $depth,
            'start_path' => $startPath,
            'max_routes' => $maxRoutes,
            'attacks_count' => $attacks->count(),
            'dispatched_at' => now(),
        ]);

        AttackAcknowledgment::query()->create([
            'user_id' => $request->user()->id,
            'project_id' => $project->id,
            'system_id' => $system->id,
            'attack_dispatch_id' => $dispatch->id,
            'accepted_responsibility' => true,
            'accepted_legal_terms' => true,
            'terms_version' => AttackAcknowledgmentTerms::VERSION,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'acknowledged_at' => now(),
        ]);

        $this->attackQueuePublisher->publishDispatchBatch(
            $dispatch,
            $system,
            $request->user(),
            $attacks,
            $scanType,
            $this->targetSessionService->resolveQueueAuth($request->user(), $system),
        );

        $this->userNotificationService->trackAttackDispatchPending($dispatch);

        $scanLabel = $scanType->label();
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
            'depth' => ($dispatch->depth ?? AttackDepth::Full)->value,
            'start_path' => $dispatch->start_path,
            'max_routes' => $dispatch->max_routes,
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
