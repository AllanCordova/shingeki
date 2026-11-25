<?php

namespace App\Services\Attack;

use App\Enums\Attack\AttackScanType;
use App\Models\Attack\Attack;
use App\Models\Attack\AttackAcknowledgment;
use App\Models\Attack\AttackDispatch;
use App\Models\Attack\BrowserCaptureSession;
use App\Models\System\System;
use App\Models\User\User;
use App\Services\Notification\UserNotificationService;
use App\Support\BrowserStateCipher;
use Illuminate\Database\Eloquent\Collection;
use RuntimeException;

class SessionCaptureCompletionService
{
    public function __construct(
        private readonly AttackCatalogService $attackCatalog,
        private readonly AttackQueuePublisher $attackQueuePublisher,
        private readonly UserNotificationService $userNotificationService,
        private readonly BrowserStateCipher $browserStateCipher,
        private readonly BrowserCaptureAuditService $audit,
    ) {}

    /**
     * @param  array<string, mixed>  $state
     * @param  list<string>  $visitedUrls
     * @return array{dispatch: AttackDispatch, message: string}
     */
    public function complete(
        BrowserCaptureSession $session,
        array $state,
        string $auditEvent = 'completed',
        ?array $auditMeta = null,
        array $visitedUrls = [],
    ): array {
        $system = $session->system;
        $user = $session->user;
        if (! $system instanceof System || ! $user instanceof User) {
            throw new RuntimeException('Captura não encontrada.');
        }

        $attacks = $this->attacksFromIds($session->attack_ids);
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
            'source' => $session->source ?? ($auditEvent === 'imported' ? 'manual_import' : 'remote_browser'),
        ]);

        if ($visitedUrls !== []) {
            $this->audit->recordNavigations($session, $visitedUrls);
        }

        $this->audit->record(
            $session,
            $auditEvent,
            meta: array_merge([
                'dispatch_id' => $dispatch->id,
            ], $auditMeta ?? []),
        );

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

        return [
            'dispatch' => $dispatch,
            'message' => 'Sessão recebida. O scan foi iniciado.',
        ];
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
}
