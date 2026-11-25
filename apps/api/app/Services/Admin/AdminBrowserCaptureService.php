<?php

namespace App\Services\Admin;

use App\Models\Attack\BrowserCaptureEvent;
use App\Models\Attack\BrowserCaptureSession;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminBrowserCaptureService
{
    /**
     * @return LengthAwarePaginator<int, BrowserCaptureSession>
     */
    public function list(
        int $perPage,
        int $page,
        ?string $userId = null,
        ?string $systemId = null,
        ?string $source = null,
        ?string $status = null,
        ?string $from = null,
        ?string $to = null,
    ): LengthAwarePaginator {
        return $this->filteredQuery($userId, $systemId, $source, $status, $from, $to)
            ->with(['user:id,name,email', 'system:id,name,project_id,target_url', 'system.project:id,name'])
            ->withCount([
                'events as navigated_count' => fn (Builder $query) => $query->where('event', 'navigated'),
            ])
            ->orderByDesc('created_at')
            ->paginate(perPage: $perPage, page: $page);
    }

    public function find(string $id): BrowserCaptureSession
    {
        return BrowserCaptureSession::query()
            ->with([
                'user:id,name,email',
                'system:id,name,project_id,target_url',
                'system.project:id,name',
                'events' => fn ($query) => $query->orderBy('created_at')->orderBy('id'),
            ])
            ->findOrFail($id);
    }

    public function exportCsv(
        ?string $userId = null,
        ?string $systemId = null,
        ?string $source = null,
        ?string $status = null,
        ?string $from = null,
        ?string $to = null,
    ): StreamedResponse {
        $sessions = $this->filteredQuery($userId, $systemId, $source, $status, $from, $to)
            ->with(['user:id,name,email', 'system:id,name,project_id', 'system.project:id,name'])
            ->withCount([
                'events as navigated_count' => fn (Builder $query) => $query->where('event', 'navigated'),
            ])
            ->orderByDesc('created_at')
            ->get();

        $filename = 'shingeki-browser-captures-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($sessions): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }

            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'capture_id',
                'status',
                'source',
                'user_id',
                'user_email',
                'user_name',
                'project_id',
                'project_name',
                'system_id',
                'system_name',
                'created_at',
                'browser_opened_at',
                'consumed_at',
                'expires_at',
                'ip_address',
                'browser_opened_ip',
                'navigated_count',
                'dispatch_id',
            ], ';');

            foreach ($sessions as $session) {
                fputcsv($out, [
                    $session->id,
                    $session->status(),
                    $session->source,
                    $session->user_id,
                    $session->user?->email,
                    $session->user?->name,
                    $session->system?->project_id,
                    $session->system?->project?->name,
                    $session->system_id,
                    $session->system?->name,
                    optional($session->created_at)?->toIso8601String(),
                    optional($session->browser_opened_at)?->toIso8601String(),
                    optional($session->consumed_at)?->toIso8601String(),
                    optional($session->expires_at)?->toIso8601String(),
                    $session->ip_address,
                    $session->browser_opened_ip,
                    $session->navigated_count ?? 0,
                    $session->attack_dispatch_id,
                ], ';');
            }

            fputcsv($out, [], ';');
            fputcsv($out, ['--- events ---'], ';');
            fputcsv($out, [
                'capture_id',
                'event_id',
                'event',
                'user_id',
                'url',
                'ip_address',
                'created_at',
                'meta_json',
            ], ';');

            /** @var Collection<int, BrowserCaptureSession> $sessions */
            $sessionIds = $sessions->pluck('id')->all();
            BrowserCaptureEvent::query()
                ->whereIn('browser_capture_session_id', $sessionIds)
                ->orderBy('created_at')
                ->orderBy('id')
                ->chunk(500, function ($events) use ($out): void {
                    foreach ($events as $event) {
                        fputcsv($out, [
                            $event->browser_capture_session_id,
                            $event->id,
                            $event->event,
                            $event->user_id,
                            $event->url,
                            $event->ip_address,
                            optional($event->created_at)?->toIso8601String(),
                            $event->meta === null ? null : json_encode($event->meta, JSON_UNESCAPED_UNICODE),
                        ], ';');
                    }
                });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * @return Builder<BrowserCaptureSession>
     */
    private function filteredQuery(
        ?string $userId,
        ?string $systemId,
        ?string $source,
        ?string $status,
        ?string $from,
        ?string $to,
    ): Builder {
        $query = BrowserCaptureSession::query();

        if (filled($userId)) {
            $query->where('user_id', $userId);
        }
        if (filled($systemId)) {
            $query->where('system_id', $systemId);
        }
        if (filled($source)) {
            $query->where('source', $source);
        }
        if (filled($from)) {
            $query->where('created_at', '>=', $from);
        }
        if (filled($to)) {
            $query->where('created_at', '<=', $to);
        }

        if ($status === 'completed') {
            $query->whereNotNull('consumed_at');
        } elseif ($status === 'pending') {
            $query->whereNull('consumed_at')->where('expires_at', '>', now());
        } elseif ($status === 'expired') {
            $query->whereNull('consumed_at')->where('expires_at', '<=', now());
        }

        return $query;
    }
}
