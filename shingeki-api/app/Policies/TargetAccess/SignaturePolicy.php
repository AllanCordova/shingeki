<?php

namespace App\Policies\TargetAccess;

use App\Models\Identity\User;
use App\Models\TargetAccess\Signature;
use App\Models\Workspace\System;

class SignaturePolicy
{
    public function generate(User $user, System $system): bool
    {
        return $system->isOwnedBy($user);
    }

    public function validate(User $user, System $system): bool
    {
        return $system->isOwnedBy($user);
    }

    public function revoke(User $user, System $system): bool
    {
        return $system->isOwnedBy($user);
    }

    public function view(User $user, Signature $signature): bool
    {
        $signature->loadMissing('system');

        return $signature->system !== null && $signature->system->isOwnedBy($user);
    }
}
