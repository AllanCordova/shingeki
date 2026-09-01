<?php

namespace App\Http\Controllers\TargetSession;

use App\Http\Controllers\Controller;
use App\Http\Requests\TargetSession\CompleteTargetSessionCapture;
use App\Services\TargetSession\TargetSessionCaptureService;
use App\Services\TargetSession\TargetSessionService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class TargetSessionCaptureController extends Controller
{
    public function __construct(
        private readonly TargetSessionCaptureService $captureService,
        private readonly TargetSessionService $targetSessionService,
    ) {}

    public function complete(CompleteTargetSessionCapture $request, string $ticket): JsonResponse
    {
        $headers = [];
        $cookies = $request->validated('cookies') ?? null;

        if (filled($request->validated('cookie'))) {
            $headers['Cookie'] = trim((string) $request->validated('cookie'));
        } elseif (is_array($cookies) && $cookies !== []) {
            $header = $this->targetSessionService->cookieHeaderFromCookies($cookies);
            if ($header !== '') {
                $headers['Cookie'] = $header;
            }
        }

        if (filled($request->validated('authorization'))) {
            $headers['Authorization'] = trim((string) $request->validated('authorization'));
        }

        $storage = $this->targetSessionService->assembleStorage(
            $request->validated('local_storage') ?? null,
            $request->validated('session_storage') ?? null,
            is_array($cookies) ? $cookies : null,
            $request->validated('routes') ?? null,
            $request->validated('origins') ?? null,
            $request->validated('user_agent') ?? null,
        );

        try {
            $session = $this->captureService->completeFromTicket($ticket, $headers, $storage);
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
            'replay' => $session->replayMeta(),
            'expires_at' => $session->expires_at,
            'updated_at' => $session->updated_at,
        ]);
    }
}
