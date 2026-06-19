<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCatalogAttack;
use App\Http\Requests\UpdateCatalogAttack;
use App\Models\Attack;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CatalogAttackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('manageCatalog');

        $attacks = Attack::query()
            ->with('user:id,name,email,role')
            ->latest()
            ->get();

        return response()->json([
            'attacks' => $attacks
                ->map(fn (Attack $attack) => $this->formatAttack($attack, $request->user()))
                ->values()
                ->all(),
        ]);
    }

    public function store(StoreCatalogAttack $request): JsonResponse
    {
        $this->authorize('manageCatalog');

        $attack = Attack::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        $attack->load('user:id,name,email,role');

        return response()->json([
            'message' => 'Catalog attack created successfully.',
            'attack' => $this->formatAttack($attack, $request->user()),
        ], 201);
    }

    public function show(Request $request, Attack $attack): JsonResponse
    {
        $this->authorize('manageCatalog');

        $attack->load('user:id,name,email,role');

        return response()->json([
            'attack' => $this->formatAttack($attack, $request->user()),
        ]);
    }

    public function update(UpdateCatalogAttack $request, Attack $attack): JsonResponse
    {
        $this->authorize('updateCatalogAttack', $attack);

        $attack->update($request->validated());
        $attack->load('user:id,name,email,role');

        return response()->json([
            'message' => 'Catalog attack updated successfully.',
            'attack' => $this->formatAttack($attack->fresh(), $request->user()),
        ]);
    }

    public function destroy(Attack $attack): JsonResponse
    {
        $this->authorize('deleteCatalogAttack', $attack);

        $attack->delete();

        return response()->json([
            'message' => 'Catalog attack deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatAttack(Attack $attack, User $viewer): array
    {
        return [
            'id' => $attack->id,
            'user_id' => $attack->user_id,
            'scan_type' => $attack->scan_type->value,
            'category' => $attack->category->value,
            'target_location' => $attack->target_location->value,
            'risk_level' => $attack->risk_level->value,
            'payload' => $attack->payload,
            'author' => $attack->relationLoaded('user') && $attack->user !== null
                ? [
                    'id' => $attack->user->id,
                    'name' => $attack->user->name,
                    'email' => $attack->user->email,
                    'role' => $attack->user->role->value,
                ]
                : null,
            'permissions' => [
                'update' => Gate::forUser($viewer)->allows('updateCatalogAttack', $attack),
                'delete' => Gate::forUser($viewer)->allows('deleteCatalogAttack', $attack),
            ],
            'created_at' => $attack->created_at,
            'updated_at' => $attack->updated_at,
        ];
    }
}
