<?php

namespace App\Http\Controllers\TargetAccess;

use App\Http\Controllers\Controller;
use App\Http\Requests\TargetAccess\SendManualProxyRequest;
use App\Http\Requests\TargetAccess\StoreManualRouteMapRequest;
use App\Http\Requests\TargetAccess\UpdateManualRouteMapRequest;
use App\Models\TargetAccess\ManualRouteMap;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use App\Services\TargetAccess\ManualProxy\ManualProxyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class ManualProxyController extends Controller
{
    public function __construct(
        private readonly ManualProxyService $manualProxyService,
    ) {}

    public function send(SendManualProxyRequest $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('useManualProxy', $system);

        try {
            $result = $this->manualProxyService->send(
                $request->user(),
                $system,
                $request->validated('method'),
                $request->validated('path'),
                $request->queryParams(),
                $request->headerParams(),
                $request->validated('body'),
                $request->validated('content_type'),
                $request->useTargetSession(),
                $request->payloadParams(),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Manual proxy request completed.',
            ...$result,
        ]);
    }

    public function indexRoutes(Request $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('useManualProxy', $system);

        $routes = ManualRouteMap::query()
            ->where('system_id', $system->id)
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'routes' => $routes
                ->map(fn (ManualRouteMap $route) => $this->formatRoute($route))
                ->values()
                ->all(),
        ]);
    }

    public function storeRoute(StoreManualRouteMapRequest $request, Project $project, System $system): JsonResponse
    {
        $this->authorize('useManualProxy', $system);

        $route = ManualRouteMap::query()->create([
            'system_id' => $system->id,
            'user_id' => $request->user()->id,
            ...$this->routeAttributes($request->validated()),
        ]);

        return response()->json([
            'message' => 'Route map saved.',
            'route' => $this->formatRoute($route),
        ], 201);
    }

    public function updateRoute(
        UpdateManualRouteMapRequest $request,
        Project $project,
        System $system,
        ManualRouteMap $manualRouteMap,
    ): JsonResponse {
        $this->authorize('useManualProxy', $system);
        $this->assertRouteOwnership($manualRouteMap, $system, $request->user()->id);

        $manualRouteMap->update($this->routeAttributes($request->validated()));

        return response()->json([
            'message' => 'Route map updated.',
            'route' => $this->formatRoute($manualRouteMap->fresh()),
        ]);
    }

    public function destroyRoute(
        Project $project,
        System $system,
        ManualRouteMap $manualRouteMap,
    ): JsonResponse {
        $this->authorize('useManualProxy', $system);
        $this->assertRouteOwnership($manualRouteMap, $system, request()->user()->id);

        $manualRouteMap->delete();

        return response()->json([
            'message' => 'Route map deleted.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function routeAttributes(array $validated): array
    {
        return [
            'name' => $validated['name'],
            'method' => strtoupper($validated['method']),
            'path' => $validated['path'],
            'query' => $this->normalizeStringMap($validated['query'] ?? null),
            'headers' => $this->normalizeStringMap($validated['headers'] ?? null),
            'body' => $validated['body'] ?? null,
            'content_type' => $validated['content_type'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatRoute(ManualRouteMap $route): array
    {
        return [
            'id' => $route->id,
            'system_id' => $route->system_id,
            'name' => $route->name,
            'method' => $route->method,
            'path' => $route->path,
            'query' => $this->formatStringMap($route->query),
            'headers' => $this->formatStringMap($route->headers),
            'body' => $route->body,
            'content_type' => $route->content_type,
            'notes' => $route->notes,
            'created_at' => $route->created_at,
            'updated_at' => $route->updated_at,
        ];
    }

    /**
     * @param  array<string, string>|null  $value
     */
    private function normalizeStringMap(?array $value): ?array
    {
        if ($value === null || $value === []) {
            return null;
        }

        return $value;
    }

    /**
     * @param  array<string, string>|null  $value
     */
    private function formatStringMap(?array $value): \stdClass
    {
        if ($value === null || $value === []) {
            return new \stdClass;
        }

        return (object) $value;
    }

    private function assertRouteOwnership(ManualRouteMap $route, System $system, string $userId): void
    {
        if ($route->system_id !== $system->id || $route->user_id !== $userId) {
            abort(404);
        }
    }
}
