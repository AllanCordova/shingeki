<?php

namespace App\Http\Controllers\Catalog\Concerns;

use App\Models\Catalog\Attack;
use App\Models\Catalog\Remediation;
use App\Models\Identity\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;

trait FormatsCatalogItem
{
    /**
     * @return array{id: string, name: string, email: string, role: string}|null
     */
    protected function formatCatalogAuthor(Model $item): ?array
    {
        if (! $item->relationLoaded('user') || $item->user === null) {
            return null;
        }

        /** @var User $user */
        $user = $item->user;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
        ];
    }

    /**
     * @return array{update: bool, delete: bool}
     */
    protected function formatCatalogPermissions(
        User $viewer,
        Attack|Remediation $item,
        string $updateAbility,
        string $deleteAbility,
    ): array {
        return [
            'update' => Gate::forUser($viewer)->allows($updateAbility, $item),
            'delete' => Gate::forUser($viewer)->allows($deleteAbility, $item),
        ];
    }
}
