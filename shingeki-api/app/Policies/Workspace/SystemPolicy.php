<?php

namespace App\Policies\Workspace;

use App\Models\Identity\User;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;

class SystemPolicy
{
    public function viewAny(User $user, Project $project): bool
    {
        return $this->userOwnsProject($user, $project);
    }

    public function view(User $user, System $system): bool
    {
        return $system->isOwnedBy($user);
    }

    public function create(User $user, Project $project): bool
    {
        return $this->userOwnsProject($user, $project);
    }

    public function update(User $user, System $system): bool
    {
        return $system->isOwnedBy($user);
    }

    public function delete(User $user, System $system): bool
    {
        return $system->isOwnedBy($user);
    }

    public function remediate(User $user, System $system): bool
    {
        return $system->isOwnedBy($user);
    }

    public function manageTargetSession(User $user, System $system): bool
    {
        return $system->isOwnedBy($user);
    }

    public function useManualProxy(User $user, System $system): bool
    {
        return $user->role->canUseManualProxy() && $system->isOwnedBy($user);
    }

    private function userOwnsProject(User $user, Project $project): bool
    {
        return $user->id === $project->user_id;
    }
}
