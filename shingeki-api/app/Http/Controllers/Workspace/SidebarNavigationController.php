<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Services\Workspace\SidebarNavigationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SidebarNavigationController extends Controller
{
    public function __construct(
        private readonly SidebarNavigationService $sidebarNavigation,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'meta' => $this->sidebarNavigation->configForUser($user)['meta'],
            'sidebar' => $this->sidebarNavigation->sidebarTreeForUser($user),
            'items' => $this->sidebarNavigation->configForUser($user)['items'],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.project_id' => ['required', 'uuid'],
            'items.*.system_id' => ['nullable', 'uuid'],
            'items.*.visible' => ['required', 'boolean'],
            'items.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        $user = $request->user();
        $this->sidebarNavigation->syncForUser($user, $validated['items']);
        $config = $this->sidebarNavigation->configForUser($user);

        return response()->json([
            'message' => 'Configuracao da sidebar salva.',
            'meta' => $config['meta'],
            'sidebar' => $this->sidebarNavigation->sidebarTreeForUser($user),
            'items' => $config['items'],
        ]);
    }
}
