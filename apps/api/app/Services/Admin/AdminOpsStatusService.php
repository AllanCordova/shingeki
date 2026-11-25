<?php

namespace App\Services\Admin;

use App\Models\Attack\AttackDispatch;
use App\Models\Attack\BrowserCaptureSession;
use Illuminate\Support\Facades\Http;
use Throwable;

class AdminOpsStatusService
{
    /**
     * @return array<string, mixed>
     */
    public function status(): array
    {
        return [
            'captured_at' => now()->toIso8601String(),
            'capture' => $this->captureHealth(),
            'queues' => $this->queueStats(),
            'usage' => [
                'last_24h' => $this->usageWindow(now()->subDay()),
                'last_7d' => $this->usageWindow(now()->subDays(7)),
            ],
            'in_flight' => $this->inFlightDispatches(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function captureHealth(): array
    {
        $base = rtrim((string) config('browser_state.capture_service_url'), '/');
        if ($base === '') {
            return [
                'configured' => false,
                'status' => 'down',
                'busy' => false,
                'active_capture_id' => null,
                'message' => 'CAPTURE_SERVICE_URL não configurado.',
            ];
        }

        try {
            $response = Http::timeout(3)
                ->acceptJson()
                ->get($base.'/health');

            if (! $response->successful()) {
                return [
                    'configured' => true,
                    'status' => 'down',
                    'busy' => false,
                    'active_capture_id' => null,
                    'message' => 'Health check falhou (HTTP '.$response->status().').',
                ];
            }

            $payload = $response->json();
            $busy = (bool) ($payload['busy'] ?? false);

            return [
                'configured' => true,
                'status' => 'ok',
                'busy' => $busy,
                'active_capture_id' => $payload['active_capture_id'] ?? null,
                'message' => $busy ? 'Navegador de captura em uso.' : 'Idle.',
            ];
        } catch (Throwable $exception) {
            return [
                'configured' => true,
                'status' => 'down',
                'busy' => false,
                'active_capture_id' => null,
                'message' => 'Não foi possível alcançar o serviço de captura.',
            ];
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function queueStats(): array
    {
        $mgmt = rtrim((string) config('ops.rabbitmq_mgmt_url'), '/');
        $user = (string) config('ops.rabbitmq_user');
        $password = (string) config('ops.rabbitmq_password');
        $vhost = rawurlencode((string) config('ops.rabbitmq_vhost', '/'));
        /** @var list<string> $queues */
        $queues = array_values(array_filter(config('ops.queues', []), fn ($name) => is_string($name) && $name !== ''));
        $polled = array_fill_keys(
            array_values(array_filter(config('ops.polled_queues', []), fn ($name) => is_string($name) && $name !== '')),
            true,
        );

        $out = [];
        foreach ($queues as $queue) {
            $entry = [
                'name' => $queue,
                'status' => 'unknown',
                'messages' => null,
                'consumers' => null,
                'message' => null,
            ];

            if ($mgmt === '') {
                $entry['status'] = 'down';
                $entry['message'] = 'RABBITMQ_MGMT_URL não configurado.';
                $out[] = $entry;
                continue;
            }

            try {
                $response = Http::withBasicAuth($user, $password)
                    ->timeout(3)
                    ->acceptJson()
                    ->get($mgmt.'/api/queues/'.$vhost.'/'.rawurlencode($queue));

                if ($response->status() === 404) {
                    $entry['status'] = 'down';
                    $entry['message'] = 'Fila não encontrada.';
                    $out[] = $entry;
                    continue;
                }

                if (! $response->successful()) {
                    $entry['status'] = 'degraded';
                    $entry['message'] = 'HTTP '.$response->status();
                    $out[] = $entry;
                    continue;
                }

                $payload = $response->json();
                $messages = (int) ($payload['messages'] ?? 0);
                $consumers = (int) ($payload['consumers'] ?? 0);
                $entry['messages'] = $messages;
                $entry['consumers'] = $consumers;
                $isPolled = isset($polled[$queue]);
                $idlePoller = $isPolled && $messages === 0;
                $entry['status'] = ($consumers > 0 || $idlePoller) ? 'ok' : 'degraded';
                $entry['message'] = match (true) {
                    $consumers > 0 => null,
                    $idlePoller => 'Fila vazia. O consumer consulta em intervalos.',
                    $messages > 0 => 'Mensagens paradas sem consumer.',
                    default => 'Sem consumers conectados.',
                };
            } catch (Throwable) {
                $entry['status'] = 'down';
                $entry['message'] = 'Management API indisponível.';
            }

            $out[] = $entry;
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function usageWindow(\DateTimeInterface $since): array
    {
        $dispatches = AttackDispatch::query()->where('created_at', '>=', $since);

        $byScan = (clone $dispatches)
            ->selectRaw('scan_type, count(*) as total')
            ->groupBy('scan_type')
            ->pluck('total', 'scan_type')
            ->all();

        $completed = (clone $dispatches)->whereNotNull('completed_at')->count();
        $failed = (clone $dispatches)->whereNotNull('failed_at')->count();
        $cancelled = (clone $dispatches)->whereNotNull('cancelled_at')->count();
        $pending = (clone $dispatches)
            ->whereNull('completed_at')
            ->whereNull('failed_at')
            ->whereNull('cancelled_at')
            ->whereNull('session_expired_at')
            ->count();

        $captures = BrowserCaptureSession::query()->where('created_at', '>=', $since);
        $openedUsers = BrowserCaptureSession::query()
            ->where('created_at', '>=', $since)
            ->whereNotNull('browser_opened_at')
            ->distinct()
            ->count('user_id');

        return [
            'dispatches_total' => (clone $dispatches)->count(),
            'dispatches_by_scan_type' => $byScan,
            'dispatches_completed' => $completed,
            'dispatches_failed' => $failed,
            'dispatches_cancelled' => $cancelled,
            'dispatches_pending' => $pending,
            'captures_created' => (clone $captures)->count(),
            'captures_completed' => BrowserCaptureSession::query()
                ->where('created_at', '>=', $since)
                ->whereNotNull('consumed_at')
                ->where(function ($query) {
                    $query->whereNull('source')->orWhere('source', '!=', 'manual_import');
                })
                ->count(),
            'captures_imported' => BrowserCaptureSession::query()
                ->where('created_at', '>=', $since)
                ->where('source', 'manual_import')
                ->whereNotNull('consumed_at')
                ->count(),
            'captures_browser_opened' => BrowserCaptureSession::query()
                ->where('created_at', '>=', $since)
                ->whereNotNull('browser_opened_at')
                ->count(),
            'unique_users_opened_browser' => $openedUsers,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function inFlightDispatches(): array
    {
        $query = AttackDispatch::query()
            ->whereNull('completed_at')
            ->whereNull('failed_at')
            ->whereNull('cancelled_at')
            ->whereNull('session_expired_at');

        $latestProgress = (clone $query)
            ->where(function ($q) {
                $q->whereNotNull('vectors_discovered')->orWhereNotNull('jobs_planned')->orWhereNotNull('probes_count');
            })
            ->orderByDesc('updated_at')
            ->value('updated_at');

        $items = (clone $query)
            ->with(['user:id,name,email', 'system:id,name,project_id'])
            ->orderByDesc('dispatched_at')
            ->limit(10)
            ->get()
            ->map(fn (AttackDispatch $dispatch) => [
                'id' => $dispatch->id,
                'scan_type' => $dispatch->scan_type->value,
                'status' => $dispatch->scanStatus(),
                'system_id' => $dispatch->system_id,
                'system_name' => $dispatch->system?->name,
                'user_email' => $dispatch->user?->email,
                'dispatched_at' => $dispatch->dispatched_at?->toIso8601String(),
                'vectors_discovered' => $dispatch->vectors_discovered,
                'jobs_planned' => $dispatch->jobs_planned,
                'probes_count' => $dispatch->probes_count,
                'updated_at' => $dispatch->updated_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return [
            'count' => (clone $query)->count(),
            'latest_progress_at' => $latestProgress?->toIso8601String(),
            'items' => $items,
        ];
    }
}
