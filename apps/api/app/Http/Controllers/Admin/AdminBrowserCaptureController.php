<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\FormatsPagination;
use App\Http\Controllers\Controller;
use App\Models\Attack\BrowserCaptureEvent;
use App\Models\Attack\BrowserCaptureSession;
use App\Services\Admin\AdminBrowserCaptureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminBrowserCaptureController extends Controller
{
    use FormatsPagination;

    public function __construct(
        private readonly AdminBrowserCaptureService $captures,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min(100, (int) $request->integer('per_page', 20)));
        $page = max(1, (int) $request->integer('page', 1));

        $paginator = $this->captures->list(
            perPage: $perPage,
            page: $page,
            userId: $request->query('user_id'),
            systemId: $request->query('system_id'),
            source: $request->query('source'),
            status: $request->query('status'),
            from: $request->query('from'),
            to: $request->query('to'),
        );

        return response()->json([
            'captures' => $paginator
                ->getCollection()
                ->map(fn (BrowserCaptureSession $session) => $this->formatListItem($session))
                ->values()
                ->all(),
            'pagination' => $this->formatPagination($paginator),
        ]);
    }

    public function show(string $capture): JsonResponse
    {
        $session = $this->captures->find($capture);

        return response()->json([
            'capture' => $this->formatDetail($session),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        return $this->captures->exportCsv(
            userId: $request->query('user_id'),
            systemId: $request->query('system_id'),
            source: $request->query('source'),
            status: $request->query('status'),
            from: $request->query('from'),
            to: $request->query('to'),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function formatListItem(BrowserCaptureSession $session): array
    {
        return [
            'id' => $session->id,
            'status' => $session->status(),
            'source' => $session->source,
            'user' => [
                'id' => $session->user?->id,
                'name' => $session->user?->name,
                'email' => $session->user?->email,
            ],
            'system' => [
                'id' => $session->system?->id,
                'name' => $session->system?->name,
                'target_url' => $session->system?->target_url,
            ],
            'project' => [
                'id' => $session->system?->project_id,
                'name' => $session->system?->project?->name,
            ],
            'created_at' => $session->created_at?->toIso8601String(),
            'browser_opened_at' => $session->browser_opened_at?->toIso8601String(),
            'consumed_at' => $session->consumed_at?->toIso8601String(),
            'expires_at' => $session->expires_at?->toIso8601String(),
            'ip_address' => $session->ip_address,
            'navigated_count' => (int) ($session->navigated_count ?? 0),
            'dispatch_id' => $session->attack_dispatch_id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatDetail(BrowserCaptureSession $session): array
    {
        return array_merge($this->formatListItem($session), [
            'browser_opened_ip' => $session->browser_opened_ip,
            'browser_opened_user_agent' => $session->browser_opened_user_agent,
            'user_agent' => $session->user_agent,
            'events' => $session->events
                ->map(fn (BrowserCaptureEvent $event) => [
                    'id' => $event->id,
                    'event' => $event->event,
                    'url' => $event->url,
                    'ip_address' => $event->ip_address,
                    'user_agent' => $event->user_agent,
                    'meta' => $event->meta,
                    'created_at' => $event->created_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
        ]);
    }
}
