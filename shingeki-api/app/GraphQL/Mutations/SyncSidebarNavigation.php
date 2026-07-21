<?php

namespace App\GraphQL\Mutations;

use App\Models\User\User;
use App\Services\Navigation\SidebarNavigationService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Auth;

final class SyncSidebarNavigation
{
    public function __construct(
        private readonly SidebarNavigationService $sidebarNavigation,
    ) {}

    /**
     * @param  array{items: list<array{projectId: string, systemId?: string|null, visible: bool, sortOrder: int}>}  $args
     * @return array{
     *   meta: array{projectsCount: int, systemsCount: int},
     *   items: list<array<string, mixed>>,
     *   tree: list<array<string, mixed>>
     * }
     */
    public function __invoke(mixed $_, array $args): array
    {
        $user = Auth::guard('sanctum')->user();

        if (! $user instanceof User) {
            throw new AuthenticationException;
        }

        $this->sidebarNavigation->syncForUser($user, $args['items']);

        return $this->sidebarNavigation->forUser($user);
    }
}
