<?php

namespace App\Http\Controllers;

use App\Http\Requests\SystemCreate;
use App\Http\Requests\SystemUpdate;
use App\Models\Project;
use App\Models\System;
use Illuminate\Http\JsonResponse;

class SystemController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('viewAny', [System::class, $project]);

        $systems = $project->systems()->latest()->get();

        return response()->json([
            'systems' => $systems->map(fn (System $system) => $this->formatSystem($system)),
        ]);
    }

    public function store(SystemCreate $request, Project $project): JsonResponse
    {
        $this->authorize('create', [System::class, $project]);

        $system = $project->systems()->create(
            $request->safe()->only(['cover_path', 'name', 'target_url', 'repository_url']),
        );

        return response()->json([
            'message' => 'System created successfully.',
            'system' => $this->formatSystem($system),
        ], 201);
    }

    public function show(Project $project, System $system): JsonResponse
    {
        $this->authorize('view', $system);

        return response()->json([
            'system' => $this->formatSystem($system),
        ]);
    }

    public function update(SystemUpdate $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('update', $system);

        $data = $request->safe()->only(['cover_path', 'name', 'target_url', 'repository_url']);

        if ($data !== []) {
            $system->update($data);
        }

        return response()->json([
            'message' => 'System updated successfully.',
            'system' => $this->formatSystem($system->fresh()),
        ]);
    }

    public function destroy(Project $project, System $system): JsonResponse
    {
        $this->authorize('delete', $system);

        $system->delete();

        return response()->json([
            'message' => 'System deleted successfully.',
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
            'repository_url' => $system->repository_url,
            'created_at' => $system->created_at,
            'updated_at' => $system->updated_at,
        ];
    }
}
