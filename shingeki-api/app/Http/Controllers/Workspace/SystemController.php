<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Http\Requests\Workspace\SystemCreate;
use App\Http\Requests\Workspace\SystemUpdate;
use App\Http\Resources\Workspace\SystemResource;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use App\Services\Identity\UserCoverLibraryService;
use Illuminate\Http\JsonResponse;

class SystemController extends Controller
{
    public function __construct(
        private readonly UserCoverLibraryService $coverLibrary,
    ) {}

    public function index(Project $project): JsonResponse
    {
        $this->authorize('viewAny', [System::class, $project]);

        $systems = $project->systems()->with('stacks')->latest()->limit(200)->get();

        return response()->json([
            'systems' => SystemResource::collection($systems),
        ]);
    }

    public function store(SystemCreate $request, Project $project): JsonResponse
    {
        $this->authorize('create', [System::class, $project]);

        $system = $project->systems()->create([
            ...$request->safe()->only(['name', 'target_url', 'login_url', 'repository_url']),
            'cover_path' => $this->coverLibrary->resolveCoverForCreate(
                $request->user(),
                $request->file('cover'),
                $request->input('cover_upload_id'),
            ),
        ]);

        $system->stacks()->sync($this->stackSyncPayload($request->validated('stack_ids')));
        $system->load('stacks');

        return response()->json([
            'message' => 'System created successfully.',
            'system' => SystemResource::make($system),
        ], 201);
    }

    public function show(Project $project, System $system): JsonResponse
    {
        $this->authorize('view', $system);

        $system->load('stacks');

        return response()->json([
            'system' => SystemResource::make($system),
        ]);
    }

    public function update(SystemUpdate $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('update', $system);

        $data = $request->safe()->only(['name', 'target_url', 'login_url', 'repository_url']);

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

        if ($request->has('stack_ids')) {
            $system->stacks()->sync($this->stackSyncPayload($request->validated('stack_ids')));
        }

        $system->load('stacks');

        return response()->json([
            'message' => 'System updated successfully.',
            'system' => SystemResource::make($system),
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
     * @param  list<string>  $stackIds
     * @return array<string, array{is_primary: bool}>
     */
    private function stackSyncPayload(array $stackIds): array
    {
        $payload = [];

        foreach ($stackIds as $index => $stackId) {
            $payload[$stackId] = ['is_primary' => $index === 0];
        }

        return $payload;
    }
}
