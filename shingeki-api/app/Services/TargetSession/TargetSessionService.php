<?php

namespace App\Services\TargetSession;

use App\Enums\TargetAuthType;
use App\Models\System;
use App\Models\SystemTargetSession;
use App\Models\User;

class TargetSessionService
{
    /**
     * @return array{type: string, headers: array<string, string>}|null
     */
    public function resolveQueueAuth(User $user, System $system): ?array
    {
        $session = $this->findActiveSession($user, $system);

        if ($session === null) {
            return null;
        }

        return [
            'type' => $session->auth_type->value,
            'headers' => $session->headers,
        ];
    }

    public function findActiveSession(User $user, System $system): ?SystemTargetSession
    {
        $session = SystemTargetSession::query()
            ->where('user_id', $user->id)
            ->where('system_id', $system->id)
            ->first();

        if ($session === null || $session->isExpired()) {
            return null;
        }

        return $session;
    }

    public function store(
        User $user,
        System $system,
        TargetAuthType $authType,
        string $credential,
        ?\DateTimeInterface $expiresAt = null,
    ): SystemTargetSession {
        $headers = $this->buildHeaders($authType, $credential);

        return SystemTargetSession::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'system_id' => $system->id,
            ],
            [
                'auth_type' => $authType,
                'headers' => $headers,
                'expires_at' => $expiresAt,
            ],
        );
    }

    public function revoke(User $user, System $system): bool
    {
        return SystemTargetSession::query()
            ->where('user_id', $user->id)
            ->where('system_id', $system->id)
            ->delete() > 0;
    }

    /**
     * @return array<string, string>
     */
    public function buildHeaders(TargetAuthType $authType, string $credential): array
    {
        $credential = trim($credential);

        return match ($authType) {
            TargetAuthType::Cookie => ['Cookie' => $credential],
            TargetAuthType::Bearer => ['Authorization' => $this->normalizeBearer($credential)],
        };
    }

    private function normalizeBearer(string $value): string
    {
        if (str_starts_with(strtolower($value), 'bearer ')) {
            return $value;
        }

        return 'Bearer '.$value;
    }
}
