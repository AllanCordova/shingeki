<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCatalogRemediation;
use App\Http\Requests\UpdateCatalogRemediation;
use App\Models\Remediation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CatalogRemediationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('manageCatalog');

        $remediations = Remediation::query()
            ->with(['stack:id,slug,name', 'user:id,name,email,role'])
            ->latest()
            ->get();

        return response()->json([
            'remediations' => $remediations
                ->map(fn (Remediation $remediation) => $this->formatRemediation($remediation, $request->user()))
                ->values()
                ->all(),
        ]);
    }

    public function store(StoreCatalogRemediation $request): JsonResponse
    {
        $this->authorize('manageCatalog');

        $remediation = Remediation::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);
        $remediation->load(['stack:id,slug,name', 'user:id,name,email,role']);

        return response()->json([
            'message' => 'Catalog remediation created successfully.',
            'remediation' => $this->formatRemediation($remediation, $request->user()),
        ], 201);
    }

    public function show(Request $request, Remediation $remediation): JsonResponse
    {
        $this->authorize('manageCatalog');

        $remediation->load(['stack:id,slug,name', 'user:id,name,email,role']);

        return response()->json([
            'remediation' => $this->formatRemediation($remediation, $request->user()),
        ]);
    }

    public function update(UpdateCatalogRemediation $request, Remediation $remediation): JsonResponse
    {
        $this->authorize('updateCatalogRemediation', $remediation);

        $remediation->update($request->validated());
        $remediation->load(['stack:id,slug,name', 'user:id,name,email,role']);

        return response()->json([
            'message' => 'Catalog remediation updated successfully.',
            'remediation' => $this->formatRemediation($remediation->fresh(), $request->user()),
        ]);
    }

    public function destroy(Remediation $remediation): JsonResponse
    {
        $this->authorize('deleteCatalogRemediation', $remediation);

        $remediation->delete();

        return response()->json([
            'message' => 'Catalog remediation deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatRemediation(Remediation $remediation, User $viewer): array
    {
        return [
            'id' => $remediation->id,
            'user_id' => $remediation->user_id,
            'stack_id' => $remediation->stack_id,
            'stack' => $remediation->relationLoaded('stack') && $remediation->stack !== null
                ? [
                    'id' => $remediation->stack->id,
                    'slug' => $remediation->stack->slug,
                    'name' => $remediation->stack->name,
                ]
                : null,
            'scan_type' => $remediation->scan_type?->value,
            'attack_category' => $remediation->attack_category?->value,
            'semgrep_rule_id' => $remediation->semgrep_rule_id,
            'title' => $remediation->title,
            'description' => $remediation->description,
            'code_snippet' => $remediation->code_snippet,
            'references' => $remediation->references ?? [],
            'author' => $remediation->relationLoaded('user') && $remediation->user !== null
                ? [
                    'id' => $remediation->user->id,
                    'name' => $remediation->user->name,
                    'email' => $remediation->user->email,
                    'role' => $remediation->user->role->value,
                ]
                : null,
            'permissions' => [
                'update' => Gate::forUser($viewer)->allows('updateCatalogRemediation', $remediation),
                'delete' => Gate::forUser($viewer)->allows('deleteCatalogRemediation', $remediation),
            ],
            'created_at' => $remediation->created_at,
            'updated_at' => $remediation->updated_at,
        ];
    }
}
