<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Http\Requests\System\UpdateSystemDispatchSettings;
use App\Models\System\System;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnedSystemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $systems = System::query()
            ->whereHas('project', fn ($query) => $query->where('user_id', $request->user()->id))
            ->with(['project', 'stacks'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'systems' => $systems->map(fn (System $system) => $this->formatSystem($system)),
        ]);
    }

    public function show(System $system): JsonResponse
    {
        $this->authorize('view', $system);

        $system->load(['project', 'stacks']);

        return response()->json([
            'system' => $this->formatSystem($system),
        ]);
    }

    public function updateDispatchSettings(
        UpdateSystemDispatchSettings $request,
        System $system,
    ): JsonResponse {
        $this->authorize('update', $system);

        $system->update([
            'dast_start_path' => $request->dastStartPath(),
            'dast_max_routes' => $request->dastMaxRoutes(),
        ]);

        $system->load(['project', 'stacks']);

        return response()->json([
            'message' => 'System dispatch settings updated successfully.',
            'system' => $this->formatSystem($system),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatSystem(System $system): array
    {
        return [
            'id' => $system->id,
            'project_id' => $system->project_id,
            'cover_path' => $system->cover_path,
            'name' => $system->name,
            'target_url' => $system->target_url,
            'login_url' => $system->login_url,
            'repository_url' => $system->repository_url,
            'dast_max_routes' => $system->dast_max_routes,
            'dast_start_path' => $system->dast_start_path,
            'stacks' => $system->relationLoaded('stacks')
                ? $system->stacks
                    ->map(fn ($stack) => [
                        'id' => $stack->id,
                        'slug' => $stack->slug,
                        'name' => $stack->name,
                        'is_primary' => (bool) $stack->pivot->is_primary,
                    ])
                    ->values()
                    ->all()
                : [],
            'project' => $system->relationLoaded('project') && $system->project !== null
                ? [
                    'id' => $system->project->id,
                    'name' => $system->project->name,
                ]
                : null,
            'created_at' => $system->created_at,
            'updated_at' => $system->updated_at,
        ];
    }
}
