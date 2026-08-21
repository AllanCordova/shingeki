<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\FormatsPagination;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListAdminUsers;
use App\Http\Requests\Admin\UpdateAdminUserRole;
use App\Models\User\User;
use App\Services\Admin\AdminUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    use FormatsPagination;

    public function __construct(
        private readonly AdminUserService $adminUsers,
    ) {}

    public function index(ListAdminUsers $request): JsonResponse
    {
        $users = $this->adminUsers->list(
            perPage: $request->perPage(),
            page: $request->page(),
            search: $request->search(),
            role: $request->role(),
        );

        return response()->json([
            'users' => $users
                ->getCollection()
                ->map(fn (User $user) => $this->formatUser($user))
                ->values()
                ->all(),
            'pagination' => $this->formatPagination($users),
        ]);
    }

    public function update(UpdateAdminUserRole $request, User $user): JsonResponse
    {
        $updated = $this->adminUsers->updateRole(
            actor: $request->user(),
            target: $user,
            role: $request->role(),
        );

        return response()->json([
            'message' => 'User role updated successfully.',
            'user' => $this->formatUser($updated),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->adminUsers->delete(
            actor: $request->user(),
            target: $user,
        );

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'avatar_path' => $user->avatar_path,
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ];
    }
}
