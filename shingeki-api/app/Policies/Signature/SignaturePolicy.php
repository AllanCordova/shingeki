<?php

namespace App\Policies\Signature;

use App\Models\Project\Project;
use App\Models\Signature\Signature;
use App\Models\System\System;
use App\Models\User\User;

class SignaturePolicy
{
    public function generate(User $user, System $system): bool
    {
        return $this->ownsSystemOnRoute($user, $system);
    }

    public function validate(User $user, System $system): bool
    {
        return $this->ownsSystemOnRoute($user, $system);
    }

    public function revoke(User $user, System $system): bool
    {
        return $this->ownsSystemOnRoute($user, $system);
    }

    public function view(User $user, Signature $signature): bool
    {
        $system = request()->route('system');

        if (! $system instanceof System) {
            return false;
        }

        return $signature->system_id === $system->id
            && $this->ownsSystemOnRoute($user, $system);
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
