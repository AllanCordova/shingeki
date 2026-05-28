<?php

namespace App\Policies;

use App\Models\Attack;
use App\Models\Project;
use App\Models\System;
use App\Models\User;

class AttackPolicy
{
    public function create(User $user, System $system): bool
    {
        return $this->systemBelongsToRouteProject($system);
    }

    public function view(User $user, Attack $attack): bool
    {
        return $user->id === $attack->user_id;
    }

    private function systemBelongsToRouteProject(System $system): bool
    {
        $project = request()->route('project');

        if (! $project instanceof Project) {
            return false;
        }

        return $system->project_id === $project->id;
    }
}
