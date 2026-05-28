<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\Signature;
use App\Models\System;
use App\Models\User;

class SignaturePolicy
{
    public function generate(User $user, System $system): bool
    {
        return $this->systemBelongsToRouteProject($system);
    }

    public function validate(User $user, System $system): bool
    {
        return $this->systemBelongsToRouteProject($system);
    }

    public function revoke(User $user, System $system): bool
    {
        return $this->systemBelongsToRouteProject($system);
    }

    public function view(User $user, Signature $signature): bool
    {
        $system = request()->route('system');

        if (! $system instanceof System) {
            return false;
        }

        return $signature->system_id === $system->id;
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
