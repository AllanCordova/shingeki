<?php

namespace App\Policies;

use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\System;
use App\Models\User;

class SystemResultPolicy
{
    public function viewAny(User $user, System $system): bool
    {
        return $this->ownsSystemProject($user, $system);
    }

    public function viewBatch(User $user, AttackDispatch $dispatch): bool
    {
        $project = request()->route('project');
        $system = request()->route('system');

        if (! $project instanceof Project || ! $system instanceof System) {
            return false;
        }

        return $this->ownsSystemProject($user, $system)
            && $dispatch->system_id === $system->id
            && $system->project_id === $project->id;
    }

    private function ownsSystemProject(User $user, System $system): bool
    {
        $project = request()->route('project');

        if (! $project instanceof Project) {
            return false;
        }

        return $user->id === $project->user_id
            && $system->project_id === $project->id;
    }
}
