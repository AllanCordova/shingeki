<?php

namespace App\Policies\Attack;

use App\Models\Attack\Attack;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;

class AttackPolicy
{
    public function create(User $user, System $system): bool
    {
        return $this->ownsSystemOnRoute($user, $system);
    }

    public function view(User $user, Attack $attack): bool
    {
        return $user->id === $attack->user_id;
    }

    private function ownsSystemOnRoute(User $user, System $system): bool
    {
        $project = request()->route('project');

        if (! $project instanceof Project) {
            return false;
        }

        return $user->id === $project->user_id
            && $system->project_id === $project->id;
    }
}
