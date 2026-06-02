<?php

namespace App\Http\Controllers;

use App\Http\Requests\SystemCreate;
use App\Http\Requests\SystemUpdate;
use App\Models\Project;
use App\Models\System;
use App\Services\Cover\UserCoverLibraryService;
use Illuminate\Http\JsonResponse;

class SystemController extends Controller
{
    public function __construct(
        private readonly UserCoverLibraryService $coverLibrary,
    ) {}

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

        $system = $project->systems()->create([
            ...$request->safe()->only(['name', 'target_url', 'repository_url']),
            'cover_path' => $this->coverLibrary->resolveCoverForCreate(
                $request->user(),
                $request->file('cover'),
                $request->input('cover_upload_id'),
            ),
        ]);

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

        $data = $request->safe()->only(['name', 'target_url', 'repository_url']);

        $newCoverPath = $this->coverLibrary->resolveCoverForUpdate(
            $request->user(),
            $request->file('cover'),
            $request->input('cover_upload_id'),
        );

        if ($newCoverPath !== null) {
            $data['cover_path'] = $newCoverPath;
        }

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

        $this->coverLibrary->releaseCoverForSystem($system);

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
