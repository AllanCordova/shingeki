<?php

namespace App\Services\Attack;

use App\Models\Attack\AttackAcknowledgment;
use App\Models\System\System;
use App\Models\User\User;
use App\Support\AttackAcknowledgmentTerms;

class AttackAcknowledgmentService
{
    public function hasCurrentAcknowledgment(User $user, System $system): bool
    {
        return AttackAcknowledgment::query()
            ->where('user_id', $user->id)
            ->where('system_id', $system->id)
            ->where('terms_version', AttackAcknowledgmentTerms::VERSION)
            ->where('accepted_responsibility', true)
            ->where('accepted_legal_terms', true)
            ->exists();
    }

    public function latestCurrentAcknowledgment(User $user, System $system): ?AttackAcknowledgment
    {
        return AttackAcknowledgment::query()
            ->where('user_id', $user->id)
            ->where('system_id', $system->id)
            ->where('terms_version', AttackAcknowledgmentTerms::VERSION)
            ->where('accepted_responsibility', true)
            ->where('accepted_legal_terms', true)
            ->latest('acknowledged_at')
            ->first();
    }
}
