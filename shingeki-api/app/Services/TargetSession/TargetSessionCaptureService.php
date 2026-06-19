<?php

namespace App\Services\TargetSession;

use App\Enums\TargetAuthType;
use App\Models\System;
use App\Models\SystemTargetSession;
use App\Models\TargetSessionCaptureTicket;
use App\Models\User;
use Illuminate\Support\Str;
use RuntimeException;

class TargetSessionCaptureService
{
    public function __construct(
        private readonly TargetSessionService $targetSessionService,
    ) {}

    /**
     * @return array{
     *   ticket: string,
     *   mode: string,
     *   popup_url: string,
     *   capture_callback_url: string|null,
     *   target_origin: string,
     *   client_origin: string,
     * }
     */
    public function start(User $user, System $system, string $clientOrigin): array
    {
        $ticket = TargetSessionCaptureTicket::query()->create([
            'user_id' => $user->id,
            'system_id' => $system->id,
            'client_origin' => rtrim($clientOrigin, '/'),
            'expires_at' => now()->addMinutes(15),
        ]);

        $clientOrigin = rtrim($clientOrigin, '/');
        $targetOrigin = $this->originFromUrl($system->target_url);

        if ($this->originsMatch($targetOrigin, $clientOrigin)) {
            $popupUrl = $clientOrigin.'/conectar-alvo'
                .'?ticket='.$ticket->id
                .'&projectId='.$system->project_id
                .'&systemId='.$system->id;

            return [
                'ticket' => $ticket->id,
                'mode' => 'same_origin',
                'popup_url' => $popupUrl,
                'capture_callback_url' => null,
                'target_origin' => $targetOrigin,
                'client_origin' => $clientOrigin,
            ];
        }

        $loginUrl = $system->login_url ?? rtrim($system->target_url, '/').'/login.php';
        $captureApiBase = rtrim((string) config('app.url'), '/').'/api';
        $capturePath = '/shingeki-capture.php?ticket='.$ticket->id
            .'&client_origin='.rawurlencode($clientOrigin)
            .'&api_base='.rawurlencode($captureApiBase);
        $popupUrl = $this->appendQueryParam($loginUrl, 'next', $capturePath);

        return [
            'ticket' => $ticket->id,
            'mode' => 'external',
            'popup_url' => $popupUrl,
            'capture_callback_url' => rtrim($system->target_url, '/').$capturePath,
            'target_origin' => $targetOrigin,
            'client_origin' => $clientOrigin,
        ];
    }

    public function completeFromTicket(string $ticketId, array $headers): SystemTargetSession
    {
        $ticket = $this->resolveTicket($ticketId);

        if ($headers === []) {
            throw new RuntimeException('No session headers were provided for capture.');
        }

        $authType = isset($headers['Authorization'])
            ? TargetAuthType::Bearer
            : TargetAuthType::Cookie;

        $credential = $authType === TargetAuthType::Bearer
            ? $headers['Authorization']
            : ($headers['Cookie'] ?? '');

        if (trim($credential) === '') {
            throw new RuntimeException('No session headers were provided for capture.');
        }

        $session = $this->targetSessionService->store(
            $ticket->user,
            $ticket->system,
            $authType,
            $credential,
        );

        $ticket->update(['consumed_at' => now()]);

        return $session;
    }

    private function resolveTicket(string $ticketId): TargetSessionCaptureTicket
    {
        $ticket = TargetSessionCaptureTicket::query()
            ->with(['user', 'system'])
            ->find($ticketId);

        if ($ticket === null) {
            throw new RuntimeException('Capture ticket not found.');
        }

        if ($ticket->isConsumed()) {
            throw new RuntimeException('Capture ticket has already been used.');
        }

        if ($ticket->isExpired()) {
            throw new RuntimeException('Capture ticket has expired.');
        }

        return $ticket;
    }

    private function originFromUrl(string $url): string
    {
        $parts = parse_url($url);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            throw new RuntimeException('System target_url is invalid.');
        }

        $origin = $parts['scheme'].'://'.$parts['host'];

        if (isset($parts['port'])) {
            $origin .= ':'.$parts['port'];
        }

        return $origin;
    }

    private function originsMatch(string $left, string $right): bool
    {
        return Str::lower($left) === Str::lower($right);
    }

    private function appendQueryParam(string $url, string $key, string $value): string
    {
        $separator = str_contains($url, '?') ? '&' : '?';

        return $url.$separator.$key.'='.urlencode($value);
    }
}
