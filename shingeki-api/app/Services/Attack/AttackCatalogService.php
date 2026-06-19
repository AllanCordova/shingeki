<?php

namespace App\Services\Attack;

use App\Enums\AttackScanType;
use App\Enums\UserRole;
use App\Models\Attack;
use Illuminate\Database\Eloquent\Collection;
use RuntimeException;

class AttackCatalogService
{
    /**
     * @return Collection<int, Attack>
     */
    public function catalogAttacks(AttackScanType $scanType = AttackScanType::Dast): Collection
    {
        return Attack::query()
            ->where('scan_type', $scanType)
            ->whereHas('user', function ($query): void {
                $query->whereIn('role', array_map(
                    static fn (UserRole $role): string => $role->value,
                    UserRole::catalogManagers(),
                ));
            })
            ->orderBy('created_at')
            ->get();
    }

    /**
     * @return Collection<int, Attack>
     */
    public function catalogAttacksOrFail(AttackScanType $scanType = AttackScanType::Dast): Collection
    {
        $attacks = $this->catalogAttacks($scanType);

        if ($attacks->isEmpty()) {
            throw new RuntimeException('No catalog attacks are available for dispatch.');
        }

        return $attacks;
    }
}
