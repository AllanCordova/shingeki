<?php

namespace App\Policies\Scanning;

use App\Models\Identity\User;
use App\Models\Scanning\AttackDispatch;
use App\Models\Workspace\System;

class SystemResultPolicy
{
    public function viewAny(User $user, System $system): bool
    {
        return $system->isOwnedBy($user);
    }

    public function viewBatch(User $user, AttackDispatch $dispatch): bool
    {
        $dispatch->loadMissing('system');

        return $dispatch->system !== null
            && $dispatch->system->isOwnedBy($user)
            && $dispatch->system_id === $dispatch->system->id;
    }

    public function deleteBatch(User $user, AttackDispatch $dispatch): bool
    {
        return $this->viewBatch($user, $dispatch);
    }

    public function deleteAny(User $user, System $system): bool
    {
        return $this->viewAny($user, $system);
    }
}
