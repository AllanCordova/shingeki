<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Http\Requests\Workspace\ProjectCreate;
use App\Http\Requests\Workspace\ProjectUpdate;
use App\Http\Resources\Workspace\ProjectResource;
use App\Models\Workspace\Project;
use App\Services\Identity\UserCoverLibraryService;
use App\Services\Workspace\ProjectDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function __construct(
        private readonly UserCoverLibraryService $coverLibrary,
        private readonly ProjectDashboardService $dashboard,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);

        $projects = Project::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(200)
            ->get();

        return response()->json([
            'projects' => ProjectResource::collection($projects),
        ]);
    }

    public function store(ProjectCreate $request): JsonResponse
    {
        $this->authorize('create', Project::class);

        $user = $request->user();

        $project = Project::create([
            ...$request->safe()->only(['name', 'description']),
            'cover_path' => $this->coverLibrary->resolveCoverForCreate(
                $user,
                $request->file('cover'),
                $request->input('cover_upload_id'),
            ),
            'user_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Project created successfully.',
            'project' => ProjectResource::make($project),
        ], 201);
    }

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'project' => ProjectResource::make($project),
        ]);
    }

    public function dashboard(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'dashboard' => $this->dashboard->build($project),
        ]);
    }

    public function update(ProjectUpdate $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->safe()->only(['name', 'description']);

        $newCoverPath = $this->coverLibrary->resolveCoverForUpdate(
            $request->user(),
            $request->file('cover'),
            $request->input('cover_upload_id'),
        );

        if ($newCoverPath !== null) {
            $data['cover_path'] = $newCoverPath;
        }

        if ($data !== []) {
            $project->update($data);
        }

        return response()->json([
            'message' => 'Project updated successfully.',
            'project' => ProjectResource::make($project->fresh()),
        ]);
    }

    public function destroy(Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $this->coverLibrary->releaseCoversForProject($project);

        return response()->json([
            'message' => 'Project deleted successfully.',
        ]);
    }
}
