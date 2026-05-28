<?php

namespace App\Services\Signature;

use App\Enums\SignatureStatus;
use App\Models\Signature;
use App\Models\System;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class SignatureAuthorizationService
{
    public function __construct(
        private readonly SignatureStatusService $statusService,
    ) {}

    public function assertPermittedToken(User $user, System $system, string $token): Signature
    {
        $signature = Signature::query()
            ->where('user_id', $user->id)
            ->where('system_id', $system->id)
            ->where('token', $token)
            ->first();

        if ($signature === null) {
            throw new AuthorizationException('Invalid signature token for this system.');
        }

        if ($this->statusService->isExpired($signature)) {
            throw new AuthorizationException('Signature token has expired.');
        }

        if ($signature->status !== SignatureStatus::Permitted) {
            throw new AuthorizationException('Signature token is not permitted for attacks.');
        }

        return $signature;
    }
}
