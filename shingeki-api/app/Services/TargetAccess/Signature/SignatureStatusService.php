<?php

namespace App\Services\TargetAccess\Signature;

use App\Enums\TargetAccess\SignatureStatus;
use App\Models\TargetAccess\Signature;
use InvalidArgumentException;

class SignatureStatusService
{
    public function resolve(SignatureStatus|string $status): SignatureStatus
    {
        if ($status instanceof SignatureStatus) {
            return $status;
        }

        $normalized = strtoupper(trim($status));

        return SignatureStatus::tryFrom($normalized)
            ?? throw new InvalidArgumentException("Invalid signature status [{$status}].");
    }

    public function isPermitted(Signature $signature): bool
    {
        return $signature->status === SignatureStatus::Permitted;
    }

    public function isDenied(Signature $signature): bool
    {
        return $signature->status === SignatureStatus::Denied;
    }

    public function isExpired(Signature $signature): bool
    {
        return $signature->expiration->isPast();
    }

    public function isActive(Signature $signature): bool
    {
        return $signature->token !== '' && ! $this->isExpired($signature);
    }
}
