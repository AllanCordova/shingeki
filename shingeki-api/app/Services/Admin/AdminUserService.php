<?php

namespace App\Services\Admin;

use App\Enums\User\UserRole;
use App\Models\Attack\Attack;
use App\Models\Remediation\Remediation;
use App\Models\User\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class AdminUserService
{
    /**
     * @return LengthAwarePaginator<int, User>
     */
    public function list(
        int $perPage,
        int $page,
        ?string $search = null,
        ?UserRole $role = null,
    ): LengthAwarePaginator {
        $query = User::query()->orderBy('name');

        if ($search !== null && $search !== '') {
            $term = '%'.$search.'%';
            $query->where(function ($builder) use ($term): void {
                $builder
                    ->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term);
            });
        }

        if ($role !== null) {
            $query->where('role', $role);
        }

        return $query->paginate(perPage: $perPage, page: $page);
    }

    public function updateRole(User $actor, User $target, UserRole $role): User
    {
        if ($actor->id === $target->id) {
            throw new AccessDeniedHttpException('You cannot change your own role.');
        }

        return DB::transaction(function () use ($target, $role): User {
            $locked = User::query()->whereKey($target->id)->lockForUpdate()->firstOrFail();

            if (
                $locked->role === UserRole::Admin
                && $role !== UserRole::Admin
                && $this->adminCount() <= 1
            ) {
                throw ValidationException::withMessages([
                    'role' => ['At least one administrator must remain on the platform.'],
                ]);
            }

            $locked->role = $role;
            $locked->save();

            return $locked->fresh();
        });
    }

    public function delete(User $actor, User $target): void
    {
        if ($actor->id === $target->id) {
            throw new AccessDeniedHttpException('You cannot delete your own account.');
        }

        DB::transaction(function () use ($actor, $target): void {
            $locked = User::query()->whereKey($target->id)->lockForUpdate()->firstOrFail();

            if (
                $locked->role === UserRole::Admin
                && $this->adminCount() <= 1
            ) {
                throw ValidationException::withMessages([
                    'user' => ['At least one administrator must remain on the platform.'],
                ]);
            }

            // Catalog rows cascade on user delete — reassign authorship first.
            Attack::query()
                ->where('user_id', $locked->id)
                ->update(['user_id' => $actor->id]);

            Remediation::query()
                ->where('user_id', $locked->id)
                ->update(['user_id' => $actor->id]);

            $locked->tokens()->delete();
            $locked->delete();
        });
    }

    private function adminCount(): int
    {
        return User::query()->where('role', UserRole::Admin)->count();
    }
}
