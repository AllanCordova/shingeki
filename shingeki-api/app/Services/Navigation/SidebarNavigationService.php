<?php

namespace App\Services\Navigation;

use App\Models\Project;
use App\Models\System;
use App\Models\User;
use App\Models\UserNavigationPin;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class SidebarNavigationService
{
    /**
     * @return array{
     *   meta: array{projectsCount: int, systemsCount: int},
     *   items: list<array<string, mixed>>,
     *   tree: list<array<string, mixed>>
     * }
     */
    public function forUser(User $user): array
    {
        $projects = Project::query()
            ->where('user_id', $user->id)
            ->with(['systems' => fn ($query) => $query->orderBy('name')])
            ->orderBy('created_at')
            ->get();

        $systemsCount = $projects->sum(fn (Project $project) => $project->systems->count());

        $saved = UserNavigationPin::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy(fn (UserNavigationPin $pin) => $this->itemKey($pin->project_id, $pin->system_id));

        $items = [];
        $fallbackOrder = 0;

        foreach ($projects as $project) {
            $projectKey = $this->itemKey($project->id, null);
            /** @var UserNavigationPin|null $projectPref */
            $projectPref = $saved->get($projectKey);

            $items[] = [
                'id' => $projectPref?->id,
                'type' => 'PROJECT',
                'projectId' => $project->id,
                'systemId' => null,
                'name' => $project->name,
                'visible' => $projectPref?->visible ?? true,
                'sortOrder' => $projectPref?->sort_order ?? $fallbackOrder,
            ];
            $fallbackOrder++;

            foreach ($project->systems as $system) {
                $systemKey = $this->itemKey($project->id, $system->id);
                /** @var UserNavigationPin|null $systemPref */
                $systemPref = $saved->get($systemKey);

                $items[] = [
                    'id' => $systemPref?->id,
                    'type' => 'SYSTEM',
                    'projectId' => $project->id,
                    'projectName' => $project->name,
                    'systemId' => $system->id,
                    'name' => $system->name,
                    'visible' => $systemPref?->visible ?? true,
                    'sortOrder' => $systemPref?->sort_order ?? $fallbackOrder,
                ];
                $fallbackOrder++;
            }
        }

        usort($items, fn (array $left, array $right) => $left['sortOrder'] <=> $right['sortOrder']);

        return [
            'meta' => [
                'projectsCount' => $projects->count(),
                'systemsCount' => $systemsCount,
            ],
            'items' => $items,
            'tree' => $this->buildTree($items),
        ];
    }

    /**
     * @param  list<array{projectId: string, systemId?: string|null, visible: bool, sortOrder: int}>  $items
     */
    public function syncForUser(User $user, array $items): void
    {
        $projectIds = Project::query()
            ->where('user_id', $user->id)
            ->pluck('id');

        $systemIdsByProject = System::query()
            ->whereIn('project_id', $projectIds)
            ->get(['id', 'project_id'])
            ->groupBy('project_id');

        $existing = UserNavigationPin::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy(fn (UserNavigationPin $pin) => $this->itemKey($pin->project_id, $pin->system_id));

        $now = Carbon::now();
        $inserts = [];
        $upserts = [];

        foreach ($items as $item) {
            if (! $projectIds->contains($item['projectId'])) {
                continue;
            }

            $systemId = $item['systemId'] ?? null;

            if ($systemId !== null) {
                $allowed = $systemIdsByProject
                    ->get($item['projectId'], collect())
                    ->contains('id', $systemId);

                if (! $allowed) {
                    continue;
                }
            }

            $key = $this->itemKey($item['projectId'], $systemId);
            /** @var UserNavigationPin|null $existingPin */
            $existingPin = $existing->get($key);

            if ($existingPin) {
                $upserts[] = [
                    'id' => $existingPin->id,
                    'user_id' => $user->id,
                    'project_id' => $item['projectId'],
                    'system_id' => $systemId,
                    'visible' => (bool) $item['visible'],
                    'sort_order' => (int) $item['sortOrder'],
                    'created_at' => $existingPin->created_at,
                    'updated_at' => $now,
                ];
            } else {
                $inserts[] = [
                    'id' => (string) Str::uuid(),
                    'user_id' => $user->id,
                    'project_id' => $item['projectId'],
                    'system_id' => $systemId,
                    'visible' => (bool) $item['visible'],
                    'sort_order' => (int) $item['sortOrder'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if ($inserts !== []) {
            UserNavigationPin::query()->insert($inserts);
        }

        if ($upserts !== []) {
            UserNavigationPin::query()->upsert(
                $upserts,
                ['id'],
                ['visible', 'sort_order', 'updated_at'],
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array{id: string, name: string, sortOrder: int, systems: list<array{id: string, name: string, sortOrder: int}>}>
     */
    private function buildTree(array $items): array
    {
        $visibleItems = collect($items)->filter(fn (array $item) => $item['visible']);

        $projects = $visibleItems
            ->where('type', 'PROJECT')
            ->sortBy('sortOrder')
            ->values();

        $systems = $visibleItems
            ->where('type', 'SYSTEM')
            ->groupBy('projectId');

        return $projects
            ->map(function (array $project) use ($systems) {
                $projectSystems = collect($systems->get($project['projectId'], collect()))
                    ->sortBy('sortOrder')
                    ->values()
                    ->map(fn (array $system) => [
                        'id' => $system['systemId'],
                        'name' => $system['name'],
                        'sortOrder' => $system['sortOrder'],
                    ])
                    ->all();

                return [
                    'id' => $project['projectId'],
                    'name' => $project['name'],
                    'sortOrder' => $project['sortOrder'],
                    'systems' => $projectSystems,
                ];
            })
            ->all();
    }

    private function itemKey(string $projectId, ?string $systemId): string
    {
        return $projectId.'|'.($systemId ?? '');
    }
}
