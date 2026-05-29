<?php

namespace App\Http\Controllers;

use App\Http\Requests\AttackDispatch as AttackDispatchRequest;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\System;
use App\Services\Attack\AttackCatalogService;
use App\Services\Attack\AttackQueuePublisher;
use App\Services\Signature\SignatureAuthorizationService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class AttackController extends Controller
{
    public function __construct(
        private readonly SignatureAuthorizationService $signatureAuthorization,
        private readonly AttackCatalogService $attackCatalog,
        private readonly AttackQueuePublisher $attackQueuePublisher,
    ) {}

    public function dispatch(AttackDispatchRequest $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('create', [Attack::class, $system]);

        try {
            $this->signatureAuthorization->assertPermittedToken(
                $request->user(),
                $system,
                $request->validated('signature_token'),
            );
        } catch (AuthorizationException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 403);
        }

        try {
            $attacks = $this->attackCatalog->catalogAttacksOrFail();
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        $dispatch = AttackDispatch::create([
            'system_id' => $system->id,
            'user_id' => $request->user()->id,
            'attacks_count' => $attacks->count(),
            'dispatched_at' => now(),
        ]);

        $this->attackQueuePublisher->publishDispatchBatch(
            $dispatch,
            $system,
            $request->user(),
            $attacks,
        );

        return response()->json([
            'message' => 'Attack catalog dispatched to processing queue.',
            'dispatch' => $this->formatDispatch($dispatch),
            'attacks_count' => $attacks->count(),
            'attacks' => $attacks->map(fn (Attack $attack) => $this->formatAttack($attack)),
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
            'category' => $attack->category->value,
            'target_location' => $attack->target_location->value,
            'risk_level' => $attack->risk_level->value,
            'payload' => $attack->payload,
            'created_at' => $attack->created_at,
            'updated_at' => $attack->updated_at,
        ];
    }
}
