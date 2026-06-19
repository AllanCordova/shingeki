<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\System;
use App\Models\User;

class SystemPolicy
{
    public function viewAny(User $user, Project $project): bool
    {
        return $this->userOwnsProject($user, $project);
    }

    public function view(User $user, System $system): bool
    {
        return $this->belongsToParentProject($system);
    }

    public function create(User $user, Project $project): bool
    {
        return $this->userOwnsProject($user, $project);
    }

    public function update(User $user, System $system): bool
    {
        return $this->belongsToParentProject($system);
    }

    public function delete(User $user, System $system): bool
    {
        return $this->belongsToParentProject($system);
    }

    public function remediate(User $user, System $system): bool
    {
        return $this->belongsToParentProject($system);
    }

    public function manageTargetSession(User $user, System $system): bool
    {
        return $this->belongsToParentProject($system);
    }

    private function userOwnsProject(User $user, Project $project): bool
    {
        return $user->id === $project->user_id;
    }

    private function belongsToParentProject(System $system): bool
    {
        $project = request()->route('project');

        if (! $project instanceof Project) {
            return false;
        }

        return $system->project_id === $project->id;
    }
}
