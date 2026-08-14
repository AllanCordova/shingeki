<?php

namespace App\Http\Controllers\TargetAccess;

use App\Http\Controllers\Controller;
use App\Models\TargetAccess\Signature;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use App\Services\TargetAccess\Signature\SignatureHtmlVerifier;
use App\Services\TargetAccess\Signature\SignatureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class SignatureController extends Controller
{
    public function __construct(
        private readonly SignatureService $signatureService,
    ) {}

    public function generate(Request $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('generate', [Signature::class, $system]);

        $signature = $this->signatureService->generate(
            $request->user(),
            $system,
            $request->ip() ?? '0.0.0.0',
        );

        return response()->json([
            'message' => 'Signature token generated successfully.',
            'signature' => $this->formatSignature($signature, includeToken: true),
            'installation' => [
                'meta_name' => SignatureHtmlVerifier::META_NAME,
                'example' => '<meta name="'.SignatureHtmlVerifier::META_NAME.'" content="'.$signature->token.'">',
            ],
        ], 201);
    }

    public function validate(Request $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('validate', [Signature::class, $system]);

        try {
            $result = $this->signatureService->validate($request->user(), $system);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'exists' => false,
                'permitted' => false,
            ], 404);
        }

        return response()->json([
            'message' => $result['permitted']
                ? 'Signature token found in system index.'
                : 'Signature token not found in system index.',
            'exists' => true,
            'found_in_html' => $result['found_in_html'],
            'permitted' => $result['permitted'],
            'signature' => $this->formatSignature($result['signature']),
        ]);
    }

    public function revoke(Request $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('revoke', [Signature::class, $system]);

        try {
            $this->signatureService->revoke($request->user(), $system);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 404);
        }

        return response()->json([
            'message' => 'Signature token revoked successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatSignature(Signature $signature, bool $includeToken = false): array
    {
        $data = [
            'id' => $signature->id,
            'user_id' => $signature->user_id,
            'system_id' => $signature->system_id,
            'ip_address' => $signature->ip_address,
            'status' => $signature->status->value,
            'expiration' => $signature->expiration,
            'created_at' => $signature->created_at,
            'updated_at' => $signature->updated_at,
        ];

        if ($includeToken) {
            $data['token'] = $signature->token;
        }

        return $data;
    }
}
