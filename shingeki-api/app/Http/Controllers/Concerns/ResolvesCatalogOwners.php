<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

trait ResolvesCatalogOwners
{
    /**
     * @param  class-string<Model>  $modelClass
     * @return list<array{id: string, name: string, email: string}>
     */
    protected function catalogOwnersFor(string $modelClass): array
    {
        return $this->formatCatalogOwners(
            User::query()
                ->select('users.id', 'users.name', 'users.email')
                ->whereIn('users.id', $modelClass::query()->select('user_id')->distinct())
                ->orderBy('users.name')
        );
    }

    /**
     * @param  Builder<User>  $query
     * @return list<array{id: string, name: string, email: string}>
     */
    private function formatCatalogOwners(Builder $query): array
    {
        return $query
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ])
            ->values()
            ->all();
    }
}
