<?php

namespace App\Http\Controllers;

use App\Http\Requests\AttackDispatch;
use App\Models\Attack;
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

    public function dispatch(AttackDispatch $request, Project $project, System $system): JsonResponse
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

        $this->attackQueuePublisher->publishDispatchBatch(
            $system,
            $request->user(),
            $attacks,
        );

        return response()->json([
            'message' => 'Attack catalog dispatched to processing queue.',
            'attacks_count' => $attacks->count(),
            'attacks' => $attacks->map(fn (Attack $attack) => $this->formatAttack($attack)),
        ], 202);
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
