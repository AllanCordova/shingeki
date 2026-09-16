<?php

namespace App\Services\Attack;

use App\Enums\Attack\AttackScanType;
use App\Enums\User\UserRole;
use App\Models\Attack\Attack;
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

    /**
     * @param  list<string>  $ids
     * @return Collection<int, Attack>
     */
    public function catalogAttacksForDispatch(AttackScanType $scanType, array $ids): Collection
    {
        $uniqueIds = array_values(array_unique($ids));

        if ($uniqueIds === []) {
            throw new RuntimeException('No catalog attacks are available for dispatch.');
        }

        $catalog = $this->catalogAttacks($scanType);

        if ($catalog->isEmpty()) {
            throw new RuntimeException('No catalog attacks are available for dispatch.');
        }

        $selected = $catalog->whereIn('id', $uniqueIds)->values();

        if ($selected->count() !== count($uniqueIds)) {
            throw new RuntimeException('One or more selected attacks are not available for this scan.');
        }

        return $selected;
    }
}
