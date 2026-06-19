<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompleteTargetSessionCapture;
use App\Services\TargetSession\TargetSessionCaptureService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class TargetSessionCaptureController extends Controller
{
    public function __construct(
        private readonly TargetSessionCaptureService $captureService,
    ) {}

    public function complete(CompleteTargetSessionCapture $request, string $ticket): JsonResponse
    {
        $headers = [];

        if (filled($request->validated('cookie'))) {
            $headers['Cookie'] = trim((string) $request->validated('cookie'));
        }

        if (filled($request->validated('authorization'))) {
            $headers['Authorization'] = trim((string) $request->validated('authorization'));
        }

        try {
            $session = $this->captureService->completeFromTicket($ticket, $headers);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Target session captured successfully.',
            'connected' => true,
            'auth_type' => $session->auth_type->value,
            'header_names' => $session->headerNames(),
            'expires_at' => $session->expires_at,
            'updated_at' => $session->updated_at,
        ]);
    }
}
