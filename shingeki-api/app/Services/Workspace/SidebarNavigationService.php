<?php

namespace App\Services\Workspace;

use App\Models\Identity\User;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use App\Models\Workspace\UserNavigationPin;

class SidebarNavigationService
{
    /**
     * @return array{meta: array{projects_count: int, systems_count: int}, items: list<array<string, mixed>>}
     */
    public function configForUser(User $user): array
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
                'type' => 'project',
                'project_id' => $project->id,
                'system_id' => null,
                'name' => $project->name,
                'visible' => $projectPref?->visible ?? true,
                'sort_order' => $projectPref?->sort_order ?? $fallbackOrder,
            ];
            $fallbackOrder++;

            foreach ($project->systems as $system) {
                $systemKey = $this->itemKey($project->id, $system->id);
                /** @var UserNavigationPin|null $systemPref */
                $systemPref = $saved->get($systemKey);

                $items[] = [
                    'id' => $systemPref?->id,
                    'type' => 'system',
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'system_id' => $system->id,
                    'name' => $system->name,
                    'visible' => $systemPref?->visible ?? true,
                    'sort_order' => $systemPref?->sort_order ?? $fallbackOrder,
                ];
                $fallbackOrder++;
            }
        }

        usort($items, fn (array $left, array $right) => $left['sort_order'] <=> $right['sort_order']);

        return [
            'meta' => [
                'projects_count' => $projects->count(),
                'systems_count' => $systemsCount,
            ],
            'items' => $items,
        ];
    }

    /**
     * @return list<array{project: array<string, mixed>, systems: list<array<string, mixed>>}>
     */
    public function sidebarTreeForUser(User $user): array
    {
        $config = $this->configForUser($user);
        $visibleItems = collect($config['items'])->filter(fn (array $item) => $item['visible']);

        $projects = $visibleItems
            ->where('type', 'project')
            ->sortBy('sort_order')
            ->values();

        $systems = $visibleItems
            ->where('type', 'system')
            ->groupBy('project_id');

        return $projects
            ->map(function (array $project) use ($systems) {
                $projectSystems = collect($systems->get($project['project_id'], collect()))
                    ->sortBy('sort_order')
                    ->values()
                    ->map(fn (array $system) => [
                        'id' => $system['system_id'],
                        'name' => $system['name'],
                        'sort_order' => $system['sort_order'],
                    ])
                    ->all();

                return [
                    'id' => $project['project_id'],
                    'name' => $project['name'],
                    'sort_order' => $project['sort_order'],
                    'systems' => $projectSystems,
                ];
            })
            ->all();
    }

    /**
     * @param  list<array{project_id: string, system_id?: string|null, visible: bool, sort_order: int}>  $items
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

        foreach ($items as $item) {
            if (! $projectIds->contains($item['project_id'])) {
                continue;
            }

            $systemId = $item['system_id'] ?? null;

            if ($systemId !== null) {
                $allowed = $systemIdsByProject
                    ->get($item['project_id'], collect())
                    ->contains('id', $systemId);

                if (! $allowed) {
                    continue;
                }
            }

            UserNavigationPin::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'project_id' => $item['project_id'],
                    'system_key' => $systemId ?? '',
                ],
                [
                    'system_id' => $systemId,
                    'visible' => (bool) $item['visible'],
                    'sort_order' => (int) $item['sort_order'],
                ],
            );
        }
    }

    private function itemKey(string $projectId, ?string $systemId): string
    {
        return $projectId.'|'.($systemId ?? '');
    }
}
