<?php

namespace App\Services\TargetSession;

use App\Enums\TargetSession\TargetAuthType;
use App\Models\System\System;
use App\Models\TargetSession\SystemTargetSession;
use App\Models\User\User;
use Laravel\Sanctum\PersonalAccessToken;
use RuntimeException;

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
        $this->assertNotPlatformApiToken($authType, $credential);

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

    private function assertNotPlatformApiToken(TargetAuthType $authType, string $credential): void
    {
        if ($authType !== TargetAuthType::Bearer) {
            return;
        }

        $token = trim($credential);
        if (str_starts_with(strtolower($token), 'bearer ')) {
            $token = trim(substr($token, 7));
        }

        if ($token === '') {
            return;
        }

        if (PersonalAccessToken::findToken($token) !== null) {
            throw new RuntimeException(
                'Platform API tokens cannot be used as target session credentials.',
            );
        }
    }
}
