<?php

namespace App\Policies\System;

use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;

class SystemPolicy
{
    public function viewAny(User $user, Project $project): bool
    {
        return $this->userOwnsProject($user, $project);
    }

    public function view(User $user, System $system): bool
    {
        return $this->ownsSystemOnRoute($user, $system);
    }

    public function create(User $user, Project $project): bool
    {
        return $this->userOwnsProject($user, $project);
    }

    public function update(User $user, System $system): bool
    {
        return $this->ownsSystemOnRoute($user, $system);
    }

    public function delete(User $user, System $system): bool
    {
        return $this->ownsSystemOnRoute($user, $system);
    }

    public function remediate(User $user, System $system): bool
    {
        return $this->ownsSystemOnRoute($user, $system);
    }

    public function manageTargetSession(User $user, System $system): bool
    {
        return $this->ownsSystemOnRoute($user, $system);
    }

    public function useManualProxy(User $user, System $system): bool
    {
        return $user->role->canUseManualProxy() && $this->ownsSystemOnRoute($user, $system);
    }

    private function userOwnsProject(User $user, Project $project): bool
    {
        return $user->id === $project->user_id;
    }

    private function ownsSystemOnRoute(User $user, System $system): bool
    {
        $project = request()->route('project');

        if ($project instanceof Project) {
            return $user->id === $project->user_id
                && $system->project_id === $project->id;
        }

        return Project::query()
            ->whereKey($system->project_id)
            ->where('user_id', $user->id)
            ->exists();
    }
}
