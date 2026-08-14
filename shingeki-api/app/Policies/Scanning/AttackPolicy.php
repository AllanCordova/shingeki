<?php

namespace App\Policies\Scanning;

use App\Models\Catalog\Attack;
use App\Models\Identity\User;
use App\Models\Workspace\System;

class AttackPolicy
{
    public function create(User $user, System $system): bool
    {
        return $system->isOwnedBy($user);
    }

    public function view(User $user, Attack $attack): bool
    {
        return $user->id === $attack->user_id;
    }
}
