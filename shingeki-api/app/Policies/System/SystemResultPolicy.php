<?php

namespace App\Policies\System;

use App\Models\Attack\AttackDispatch;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;

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

    public function deleteBatch(User $user, AttackDispatch $dispatch): bool
    {
        return $this->viewBatch($user, $dispatch);
    }

    public function deleteAny(User $user, System $system): bool
    {
        return $this->viewAny($user, $system);
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
