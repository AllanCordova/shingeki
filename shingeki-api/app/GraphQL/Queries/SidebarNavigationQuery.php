<?php

namespace App\GraphQL\Queries;

use App\Models\User\User;
use App\Services\Navigation\SidebarNavigationService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Auth;

final class SidebarNavigationQuery
{
    public function __construct(
        private readonly SidebarNavigationService $sidebarNavigation,
    ) {}

    /**
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

        return $this->sidebarNavigation->forUser($user);
    }
}
