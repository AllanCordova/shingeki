<?php

namespace App\Policies;

use App\Models\Attack;
use App\Models\Remediation;
use App\Models\User;

class CatalogPolicy
{
    public function manage(User $user): bool
    {
        return $user->role->canManageCatalog();
    }

    public function bulkImport(User $user): bool
    {
        return $user->role->canBulkImportCatalog();
    }

    public function updateAttack(User $user, Attack $attack): bool
    {
        return $user->role->canModifyOwnedCatalogItem($attack->user_id, $user->id);
    }

    public function deleteAttack(User $user, Attack $attack): bool
    {
        return $this->updateAttack($user, $attack);
    }

    public function updateRemediation(User $user, Remediation $remediation): bool
    {
        return $user->role->canModifyOwnedCatalogItem($remediation->user_id, $user->id);
    }

    public function deleteRemediation(User $user, Remediation $remediation): bool
    {
        return $this->updateRemediation($user, $remediation);
    }
}
