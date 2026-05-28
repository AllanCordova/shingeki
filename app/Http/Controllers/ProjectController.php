<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProjectCreate;
use App\Http\Requests\ProjectUpdate;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
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

        $project = Project::create([
            ...$request->safe()->only(['cover_path', 'name', 'description']),
            'user_id' => $request->user()->id,
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

    public function update(ProjectUpdate $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->safe()->only(['cover_path', 'name', 'description']);

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

        $project->delete();

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
