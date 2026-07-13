<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProjectCreate;
use App\Http\Requests\ProjectUpdate;
use App\Models\Project;
use App\Services\Cover\UserCoverLibraryService;
use App\Services\Project\ProjectDashboardService;
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
            ->get();

        return response()->json([
            'projects' => $projects->map(fn (Project $project) => $this->formatProject($project)),
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
            'project' => $this->formatProject($project),
        ], 201);
    }

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'project' => $this->formatProject($project),
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
            'project' => $this->formatProject($project->fresh()),
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

    /**
     * @return array<string, mixed>
     */
    private function formatProject(Project $project): array
    {
        return [
            'id' => $project->id,
            'user_id' => $project->user_id,
            'cover_path' => $project->cover_path,
            'name' => $project->name,
            'description' => $project->description,
            'created_at' => $project->created_at,
            'updated_at' => $project->updated_at,
        ];
    }
}
