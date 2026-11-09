<?php

namespace App\Http\Controllers\Attack;

use App\Enums\Attack\AttackScanType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attack\AttackDispatch as AttackDispatchRequest;
use App\Models\Attack\Attack;
use App\Models\Attack\AttackAcknowledgment;
use App\Models\Attack\AttackDispatch;
use App\Models\Attack\BrowserCaptureSession;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;
use App\Services\Attack\AttackCatalogService;
use App\Services\Attack\AttackQueuePublisher;
use App\Services\Notification\UserNotificationService;
use App\Support\AttackAcknowledgmentTerms;
use App\Support\BrowserStateCipher;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class SessionCaptureController extends Controller
{
    public function __construct(
        private readonly AttackCatalogService $attackCatalog,
        private readonly AttackQueuePublisher $attackQueuePublisher,
        private readonly UserNotificationService $userNotificationService,
        private readonly BrowserStateCipher $browserStateCipher,
    ) {}

    public function store(AttackDispatchRequest $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('create', [Attack::class, $system]);

        try {
            $this->attacksFor($request, $system);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        $token = bin2hex(random_bytes(32));
        $openUrl = (string) $system->target_url;
        $ttl = max(1, (int) config('browser_state.ttl_minutes', 15));

        $capture = BrowserCaptureSession::query()->create([
            'system_id' => $system->id,
            'user_id' => $request->user()->id,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addMinutes($ttl),
            'depth' => $request->attackDepth()->value,
            'start_path' => $request->routeMap() === null ? ($request->startPath() ?? $system->dast_start_path) : null,
            'max_routes' => $request->routeMap() === null ? ($request->maxRoutes() ?? $system->dast_max_routes) : null,
            'route_map' => $request->routeMap(),
            'attack_ids' => $request->attackIds(),
            'terms_version' => AttackAcknowledgmentTerms::VERSION,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'capture' => [
                'id' => $capture->id,
                'status' => $capture->status(),
                'expires_at' => $capture->expires_at,
                'login_url' => $openUrl,
                'dispatch_id' => null,
            ],
            'token' => $token,
            'remote_available' => $this->remoteAvailable(),
        ], 201);
    }

    public function show(Request $request, Project $project, System $system, string $capture): JsonResponse
    {
        $this->authorize('create', [Attack::class, $system]);

        $session = $this->ownedCapture($request, $system, $capture);

        return response()->json([
            'capture' => [
                'id' => $session->id,
                'status' => $session->status(),
                'expires_at' => $session->expires_at,
                'dispatch_id' => $session->attack_dispatch_id,
            ],
        ]);
    }

    public function browser(Request $request, Project $project, System $system, string $capture): JsonResponse
    {
        $this->authorize('create', [Attack::class, $system]);

        $session = $this->ownedCapture($request, $system, $capture);
        if ($session->status() !== 'pending') {
            return response()->json([
                'message' => 'Esta captura não está mais pendente.',
            ], 422);
        }

        $token = $request->string('token')->toString();
        if ($token === '' || ! hash_equals($session->token_hash, hash('sha256', $token))) {
            return response()->json([
                'message' => 'Token de captura inválido.',
            ], 422);
        }

        if (! $this->remoteAvailable()) {
            return response()->json([
                'message' => 'O navegador de captura não está configurado.',
            ], 503);
        }

        $system->refresh();
        $openUrl = (string) $system->target_url;
        $vncPassword = bin2hex(random_bytes(8));

        $response = Http::withToken((string) config('browser_state.capture_service_token'))
            ->timeout(10)
            ->acceptJson()
            ->post(rtrim((string) config('browser_state.capture_service_url'), '/').'/sessions', [
                'login_url' => $openUrl,
                'complete_url' => $this->completeUrl($token, config('browser_state.complete_base_url')),
                'vnc_password' => $vncPassword,
            ]);

        if ($response->status() === 409) {
            return response()->json([
                'message' => 'Já existe um navegador de captura aberto.',
            ], 409);
        }

        if (! $response->successful()) {
            return response()->json([
                'message' => 'Não foi possível abrir o navegador de captura.',
            ], 502);
        }

        return response()->json([
            'novnc_url' => $this->novncUrl($vncPassword),
        ]);
    }

    public function complete(Request $request, string $token): JsonResponse
    {
        $session = BrowserCaptureSession::query()
            ->where('token_hash', hash('sha256', $token))
            ->first();

        if ($session === null) {
            return response()->json([
                'message' => 'Captura não encontrada.',
            ], 404);
        }

        if ($session->consumed_at !== null || $session->expires_at->isPast()) {
            return response()->json([
                'message' => 'Este token de captura não pode mais ser usado.',
            ], 410);
        }

        $state = $this->validatedState($request);
        if ($state instanceof JsonResponse) {
            return $state;
        }

        $system = $session->system;
        $user = $session->user;
        if (! $system instanceof System || ! $user instanceof User) {
            return response()->json([
                'message' => 'Captura não encontrada.',
            ], 404);
        }

        try {
            $attacks = $this->attacksFromIds($session->attack_ids);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        $plaintext = json_encode($state, JSON_THROW_ON_ERROR);
        $envelope = $this->browserStateCipher->encrypt($plaintext);

        $dispatch = AttackDispatch::query()->create([
            'system_id' => $system->id,
            'user_id' => $user->id,
            'scan_type' => AttackScanType::Dast,
            'depth' => $session->depth,
            'start_path' => $session->start_path,
            'max_routes' => $session->max_routes,
            'route_map' => $session->route_map,
            'browser_state' => $envelope,
            'attacks_count' => $attacks->count(),
            'dispatched_at' => now(),
        ]);

        AttackAcknowledgment::query()->create([
            'user_id' => $user->id,
            'project_id' => $system->project_id,
            'system_id' => $system->id,
            'attack_dispatch_id' => $dispatch->id,
            'accepted_responsibility' => true,
            'accepted_legal_terms' => true,
            'terms_version' => $session->terms_version,
            'ip_address' => $session->ip_address,
            'user_agent' => $session->user_agent,
            'acknowledged_at' => now(),
        ]);

        $session->update([
            'consumed_at' => now(),
            'attack_dispatch_id' => $dispatch->id,
        ]);

        $this->attackQueuePublisher->publishDispatchBatch(
            $dispatch,
            $system,
            $user,
            $attacks,
            AttackScanType::Dast,
            [
                'type' => 'browser_state',
                'state' => $envelope,
            ],
        );

        $this->userNotificationService->trackAttackDispatchPending($dispatch);

        return response()->json([
            'message' => 'Sessão recebida. O scan foi iniciado.',
            'dispatch_id' => $dispatch->id,
        ], 202);
    }

    private function ownedCapture(Request $request, System $system, string $capture): BrowserCaptureSession
    {
        return BrowserCaptureSession::query()
            ->whereKey($capture)
            ->where('system_id', $system->id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
    }

    /**
     * @return Collection<int, Attack>
     */
    private function attacksFor(AttackDispatchRequest $request, System $system)
    {
        $ids = $request->attackIds() ?? $system->attackIdsFor(AttackScanType::Dast);

        return $ids === null
            ? $this->attackCatalog->catalogAttacksOrFail(AttackScanType::Dast)
            : $this->attackCatalog->catalogAttacksForDispatch(AttackScanType::Dast, $ids);
    }

    /**
     * @return Collection<int, Attack>
     */
    private function attacksFromIds(mixed $ids)
    {
        if (! is_array($ids) || $ids === []) {
            return $this->attackCatalog->catalogAttacksOrFail(AttackScanType::Dast);
        }

        /** @var list<string> $attackIds */
        $attackIds = array_values(array_filter($ids, fn (mixed $id): bool => is_string($id) && $id !== ''));

        return $this->attackCatalog->catalogAttacksForDispatch(AttackScanType::Dast, $attackIds);
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
    private function validatedState(Request $request): array|JsonResponse
    {
        $raw = $request->getContent();
        if (! is_string($raw) || strlen($raw) > 1_048_576) {
            return response()->json([
                'message' => 'O estado do navegador é grande demais.',
            ], 422);
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded) || array_is_list($decoded)) {
            return response()->json([
                'message' => 'O estado do navegador precisa ser um objeto JSON.',
            ], 422);
        }

        $cookies = $decoded['cookies'] ?? [];
        $origins = $decoded['origins'] ?? [];
        if (! is_array($cookies) || ! is_array($origins) || array_is_list($decoded)) {
            return response()->json([
                'message' => 'O estado do navegador precisa seguir o storageState.',
            ], 422);
        }

        if (! $this->stateHasSession($cookies, $origins)) {
            return response()->json([
                'message' => 'A sessão capturada está vazia.',
            ], 422);
        }

        return $decoded;
    }

    /**
     * @param  array<mixed>  $cookies
     * @param  array<mixed>  $origins
     */
    private function stateHasSession(array $cookies, array $origins): bool
    {
        if ($cookies !== []) {
            return true;
        }

        foreach ($origins as $origin) {
            if (! is_array($origin)) {
                continue;
            }
            foreach (['localStorage', 'sessionStorage'] as $key) {
                if (isset($origin[$key]) && is_array($origin[$key]) && $origin[$key] !== []) {
                    return true;
                }
            }
        }

        return false;
    }

    private function completeUrl(string $token, mixed $base = null): string
    {
        $origin = is_string($base) && $base !== '' ? $base : (string) config('app.url');

        return rtrim($origin, '/').'/api/session-captures/'.$token.'/complete';
    }

    private function novncUrl(string $password): string
    {
        $base = (string) config('browser_state.novnc_public_url');
        $separator = str_contains($base, '?') ? '&' : '?';

        return $base.$separator.'password='.rawurlencode($password);
    }

    private function remoteAvailable(): bool
    {
        return filled(config('browser_state.capture_service_url'))
            && filled(config('browser_state.capture_service_token'))
            && filled(config('browser_state.novnc_public_url'));
    }
}
