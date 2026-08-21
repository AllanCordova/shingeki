<?php

namespace App\Services\Notification;

use App\Enums\Catalog\CatalogImportStatus;
use App\Enums\Catalog\CatalogImportType;
use App\Enums\User\UserNotificationStatus;
use App\Enums\User\UserNotificationType;
use App\Models\Attack\AttackDispatch;
use App\Models\Catalog\CatalogImport;
use App\Models\System\System;
use App\Models\User\User;
use App\Models\User\UserNotification;

class UserNotificationService
{
    public function trackAttackDispatchPending(AttackDispatch $dispatch): UserNotification
    {
        $dispatch->loadMissing('system.project');

        $system = $dispatch->system;
        $scanLabel = $dispatch->scan_type->label();

        return UserNotification::query()->create([
            'user_id' => $dispatch->user_id,
            'type' => UserNotificationType::AttackDispatch,
            'status' => UserNotificationStatus::Pending,
            'subject_type' => AttackDispatch::class,
            'subject_id' => $dispatch->id,
            'title' => "Scan {$scanLabel} em andamento",
            'body' => $system?->name ?? 'Sistema',
            'action_url' => $this->attackDispatchActionUrl($dispatch, $system),
            'payload' => [
                'scan_type' => $dispatch->scan_type->value,
                'system_id' => $dispatch->system_id,
                'project_id' => $system?->project_id,
            ],
        ]);
    }

    public function completeAttackDispatch(AttackDispatch $dispatch): ?UserNotification
    {
        $notification = $this->findForSubject($dispatch);
        if ($notification === null) {
            return null;
        }

        $dispatch->loadMissing('system');
        $scanLabel = $dispatch->scan_type->label();
        $findings = (int) ($dispatch->findings_count ?? 0);
        $durationMs = (int) ($dispatch->duration_ms ?? 0);
        $durationLabel = $durationMs >= 1000
            ? round($durationMs / 1000, 1).' s'
            : $durationMs.' ms';

        $notification->update([
            'status' => UserNotificationStatus::Completed,
            'title' => "Scan {$scanLabel} finalizado",
            'body' => sprintf(
                '%s — %d achado(s) em %s',
                $dispatch->system?->name ?? 'Sistema',
                $findings,
                $durationLabel,
            ),
            'read_at' => null,
            'payload' => [
                ...($notification->payload ?? []),
                'findings_count' => $findings,
                'duration_ms' => $durationMs,
            ],
        ]);

        return $notification->fresh();
    }

    public function trackCatalogImportPending(CatalogImport $import): UserNotification
    {
        $label = $this->catalogImportLabel($import->type);

        return UserNotification::query()->create([
            'user_id' => $import->user_id,
            'type' => UserNotificationType::CatalogImport,
            'status' => UserNotificationStatus::Pending,
            'subject_type' => CatalogImport::class,
            'subject_id' => $import->id,
            'title' => "Importação de {$label} em andamento",
            'body' => sprintf('%d linha(s) na fila', $import->total_rows),
            'action_url' => $this->catalogImportActionUrl($import->type),
            'payload' => [
                'import_type' => $import->type->value,
                'total_rows' => $import->total_rows,
            ],
        ]);
    }

    public function finalizeCatalogImport(CatalogImport $import): ?UserNotification
    {
        $notification = $this->findForSubject($import);

        if ($notification === null && $import->status !== CatalogImportStatus::Failed) {
            return null;
        }

        $label = $this->catalogImportLabel($import->type);
        $failed = $import->status === CatalogImportStatus::Failed
            || ($import->failed_count > 0 && $import->success_count === 0);

        if ($notification === null) {
            return UserNotification::query()->create([
                'user_id' => $import->user_id,
                'type' => UserNotificationType::CatalogImport,
                'status' => $failed ? UserNotificationStatus::Failed : UserNotificationStatus::Completed,
                'subject_type' => CatalogImport::class,
                'subject_id' => $import->id,
                'title' => $failed
                    ? "Importação de {$label} falhou"
                    : "Importação de {$label} concluída",
                'body' => $this->catalogImportSummaryBody($import),
                'action_url' => $this->catalogImportActionUrl($import->type),
                'payload' => $this->catalogImportPayload($import),
            ]);
        }

        $notification->update([
            'status' => $failed ? UserNotificationStatus::Failed : UserNotificationStatus::Completed,
            'title' => $failed
                ? "Importação de {$label} falhou"
                : "Importação de {$label} concluída",
            'body' => $this->catalogImportSummaryBody($import),
            'read_at' => null,
            'payload' => $this->catalogImportPayload($import),
        ]);

        return $notification->fresh();
    }

    public function reconcilePendingFor(User $user): void
    {
        $pending = UserNotification::query()
            ->where('user_id', $user->id)
            ->where('status', UserNotificationStatus::Pending)
            ->get();

        if ($pending->isEmpty()) {
            return;
        }

        $dispatchIds = $pending
            ->filter(fn (UserNotification $notification) => $notification->type === UserNotificationType::AttackDispatch)
            ->pluck('subject_id')
            ->filter()
            ->values()
            ->all();

        if ($dispatchIds !== []) {
            AttackDispatch::query()
                ->whereIn('id', $dispatchIds)
                ->whereNotNull('completed_at')
                ->get()
                ->each(fn (AttackDispatch $dispatch) => $this->completeAttackDispatch($dispatch));
        }

        $importIds = $pending
            ->filter(fn (UserNotification $notification) => $notification->type === UserNotificationType::CatalogImport)
            ->pluck('subject_id')
            ->filter()
            ->values()
            ->all();

        if ($importIds === []) {
            return;
        }

        CatalogImport::query()
            ->whereIn('id', $importIds)
            ->whereIn('status', [
                CatalogImportStatus::Completed,
                CatalogImportStatus::Failed,
            ])
            ->get()
            ->each(fn (CatalogImport $import) => $this->finalizeCatalogImport($import));
    }

    private function findForSubject(AttackDispatch|CatalogImport $subject): ?UserNotification
    {
        $type = $subject instanceof AttackDispatch
            ? UserNotificationType::AttackDispatch
            : UserNotificationType::CatalogImport;

        return UserNotification::query()
            ->where('type', $type)
            ->where('subject_id', $subject->id)
            ->latest()
            ->first();
    }

    private function attackDispatchActionUrl(AttackDispatch $dispatch, ?System $system): ?string
    {
        if ($system === null || $system->project_id === null) {
            return null;
        }

        return '/projetos/'.$system->project_id.'/sistemas/'.$system->id.'/resultados/'.$dispatch->id;
    }

    private function catalogImportActionUrl(CatalogImportType $type): string
    {
        return $type === CatalogImportType::Attacks
            ? '/auditoria/ataques'
            : '/auditoria/medicacoes';
    }

    private function catalogImportLabel(CatalogImportType $type): string
    {
        return $type === CatalogImportType::Attacks ? 'ataques' : 'medicações';
    }

    /**
     * @return array<string, mixed>
     */
    private function catalogImportPayload(CatalogImport $import): array
    {
        return [
            'import_type' => $import->type->value,
            'total_rows' => $import->total_rows,
            'success_count' => $import->success_count,
            'failed_count' => $import->failed_count,
        ];
    }

    private function catalogImportSummaryBody(CatalogImport $import): string
    {
        if ($import->status === CatalogImportStatus::Failed && $import->processed_rows === 0) {
            return 'Revise o template e tente novamente.';
        }

        return sprintf(
            '%d ok · %d erro(s) de %d linha(s)',
            $import->success_count,
            $import->failed_count,
            $import->total_rows,
        );
    }
}
