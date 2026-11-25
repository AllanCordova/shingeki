<?php

namespace App\Services\Attack;

use App\Models\Attack\BrowserCaptureEvent;
use App\Models\Attack\BrowserCaptureSession;
use Illuminate\Http\Request;

class BrowserCaptureAuditService
{
    /**
     * @param  array<string, mixed>|null  $meta
     */
    public function record(
        BrowserCaptureSession $session,
        string $event,
        ?Request $request = null,
        ?string $url = null,
        ?array $meta = null,
        ?string $ip = null,
        ?string $userAgent = null,
    ): BrowserCaptureEvent {
        return BrowserCaptureEvent::query()->create([
            'browser_capture_session_id' => $session->id,
            'user_id' => $session->user_id,
            'event' => $event,
            'url' => $url,
            'ip_address' => $ip ?? $request?->ip() ?? $session->ip_address,
            'user_agent' => $userAgent ?? $request?->userAgent() ?? $session->user_agent,
            'meta' => $meta,
            'created_at' => now(),
        ]);
    }

    /**
     * @param  list<string>  $urls
     */
    public function recordNavigations(BrowserCaptureSession $session, array $urls): void
    {
        $seen = [];
        foreach ($urls as $url) {
            if (! is_string($url)) {
                continue;
            }
            $trimmed = trim($url);
            if ($trimmed === '' || isset($seen[$trimmed])) {
                continue;
            }
            if (strlen($trimmed) > 2048) {
                $trimmed = substr($trimmed, 0, 2048);
            }
            $seen[$trimmed] = true;
            $this->record($session, 'navigated', url: $trimmed);
        }
    }
}
