<?php

namespace App\Services\Attack;

use App\Models\Attack;
use Illuminate\Database\Eloquent\Collection;
use RuntimeException;

class AttackCatalogService
{
    /**
     * @return Collection<int, Attack>
     */
    public function catalogAttacks(): Collection
    {
        return Attack::query()
            ->whereHas('user', function ($query): void {
                $query->where('email', config('attacks.catalog_admin_email'));
            })
            ->orderBy('created_at')
            ->get();
    }

    /**
     * @return Collection<int, Attack>
     */
    public function catalogAttacksOrFail(): Collection
    {
        $attacks = $this->catalogAttacks();

        if ($attacks->isEmpty()) {
            throw new RuntimeException('No catalog attacks are available for dispatch.');
        }

        return $attacks;
    }
}
