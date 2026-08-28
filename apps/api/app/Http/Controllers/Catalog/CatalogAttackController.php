<?php

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Concerns\FormatsCatalogItem;
use App\Http\Controllers\Concerns\FormatsPagination;
use App\Http\Controllers\Concerns\ResolvesCatalogOwners;
use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ListCatalogItems;
use App\Http\Requests\Catalog\StoreCatalogAttack;
use App\Http\Requests\Catalog\UpdateCatalogAttack;
use App\Models\Attack\Attack;
use App\Models\User\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogAttackController extends Controller
{
    use FormatsCatalogItem;
    use FormatsPagination;
    use ResolvesCatalogOwners;

    public function index(ListCatalogItems $request): JsonResponse
    {
        $this->authorize('manageCatalog');

        $query = Attack::query()
            ->with('user:id,name,email,role')
            ->latest();

        if ($ownerUserId = $request->ownerUserId()) {
            $query->where('user_id', $ownerUserId);
        }

        $attacks = $query->paginate(
            perPage: $request->perPage(),
            page: $request->page(),
        );

        return response()->json([
            'attacks' => $attacks
                ->getCollection()
                ->map(fn (Attack $attack) => $this->formatAttack($attack, $request->user()))
                ->values()
                ->all(),
            'pagination' => $this->formatPagination($attacks),
            'owners' => $this->catalogOwnersFor(Attack::class),
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
            'author' => $this->formatCatalogAuthor($attack),
            'permissions' => $this->formatCatalogPermissions(
                $viewer,
                $attack,
                'updateCatalogAttack',
                'deleteCatalogAttack',
            ),
            'created_at' => $attack->created_at,
            'updated_at' => $attack->updated_at,
        ];
    }
}
