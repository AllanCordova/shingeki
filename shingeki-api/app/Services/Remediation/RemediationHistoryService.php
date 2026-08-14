<?php

namespace App\Services\Remediation;

use App\Enums\Remediation\RemediationRunType;
use App\Models\Attack\AttackDispatch;
use App\Models\Remediation\GithubRemediationPullRequest;
use App\Models\Remediation\RemediationRun;
use App\Models\System\System;
use App\Models\User\User;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Illuminate\Support\Collection;

class RemediationHistoryService
{
    public function recordRun(
        System $system,
        AttackDispatch $dispatch,
        RemediationRunType $type,
        int $findingsCount,
        ?User $user = null,
        ?string $provider = null,
        ?string $model = null,
    ): RemediationRun {
        return RemediationRun::query()->create([
            'system_id' => $system->id,
            'attack_dispatch_id' => $dispatch->id,
            'user_id' => $user?->id,
            'type' => $type,
            'findings_count' => $findingsCount,
            'provider' => $provider,
            'model' => $model,
        ]);
    }

    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public function timelineForSystem(
        System $system,
        int $page = 1,
        int $perPage = 25,
        ?CarbonInterface $from = null,
        ?CarbonInterface $to = null,
        ?string $type = null,
    ): LengthAwarePaginator {
        $events = $this->collectEvents($system, $from, $to)
            ->when($type !== null, fn (Collection $collection) => $collection->filter(
                fn (array $event) => $this->matchesType($event['type'], $type),
            ))
            ->sortByDesc(fn (array $event) => $event['occurred_at'])
            ->values();

        $total = $events->count();
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        $offset = ($page - 1) * $perPage;

        return new Paginator(
            $events->slice($offset, $perPage)->values()->all(),
            $total,
            $perPage,
            $page,
            [
                'path' => Paginator::resolveCurrentPath(),
                'pageName' => 'page',
            ],
        );
    }

    private function matchesType(string $eventType, string $filter): bool
    {
        return match ($filter) {
            'attack' => in_array($eventType, ['scan_completed', 'scan_clean'], true),
            'catalog_suggestion',
            'ai_suggestion',
            'github_pr' => $eventType === $filter,
            default => true,
        };
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function collectEvents(
        System $system,
        ?CarbonInterface $from,
        ?CarbonInterface $to,
    ): Collection {
        $events = collect();

        $dispatches = AttackDispatch::query()
            ->where('system_id', $system->id)
            ->whereNotNull('completed_at')
            ->when($from !== null, fn ($query) => $query->where('completed_at', '>=', $from))
            ->when($to !== null, fn ($query) => $query->where('completed_at', '<=', $to))
            ->latest('completed_at')
            ->get(['id', 'completed_at', 'findings_count', 'scan_type', 'dispatched_at']);

        foreach ($dispatches as $dispatch) {
            $findings = $dispatch->findings_count ?? 0;
            $events->push([
                'id' => 'scan-'.$dispatch->id,
                'type' => $findings === 0 ? 'scan_clean' : 'scan_completed',
                'occurred_at' => $dispatch->completed_at,
                'dispatch_id' => $dispatch->id,
                'findings_count' => $findings,
                'scan_type' => $dispatch->scan_type->value,
                'label' => $findings === 0
                    ? 'Re-scan concluido sem achados'
                    : "Scan concluido com {$findings} achado(s)",
            ]);
        }

        RemediationRun::query()
            ->where('system_id', $system->id)
            ->when($from !== null, fn ($query) => $query->where('created_at', '>=', $from))
            ->when($to !== null, fn ($query) => $query->where('created_at', '<=', $to))
            ->latest()
            ->get()
            ->each(function (RemediationRun $run) use ($events) {
                $findings = $run->findings_count;
                $isAi = $run->type === RemediationRunType::AiSuggestion;

                $events->push([
                    'id' => $run->id,
                    'type' => $run->type->value,
                    'occurred_at' => $run->created_at,
                    'dispatch_id' => $run->attack_dispatch_id,
                    'findings_count' => $findings,
                    'provider' => $run->provider,
                    'model' => $run->model,
                    'label' => $isAi
                        ? ($findings > 0
                            ? "IA sugeriu correcoes ({$findings} achado(s))"
                            : 'IA sugeriu correcoes')
                        : ($findings > 0
                            ? "Sistema gerou correcoes ({$findings} achado(s))"
                            : 'Sistema gerou correcoes'),
                ]);
            });

        GithubRemediationPullRequest::query()
            ->where('system_id', $system->id)
            ->when($from !== null, fn ($query) => $query->where('created_at', '>=', $from))
            ->when($to !== null, fn ($query) => $query->where('created_at', '<=', $to))
            ->latest()
            ->get([
                'id',
                'attack_dispatch_id',
                'github_pr_number',
                'github_pr_url',
                'head_branch',
                'files_changed',
                'created_at',
            ])
            ->each(function (GithubRemediationPullRequest $pullRequest) use ($events) {
                $events->push([
                    'id' => $pullRequest->id,
                    'type' => 'github_pr',
                    'occurred_at' => $pullRequest->created_at,
                    'dispatch_id' => $pullRequest->attack_dispatch_id,
                    'pull_request_id' => $pullRequest->id,
                    'github_pr_number' => $pullRequest->github_pr_number,
                    'github_pr_url' => $pullRequest->github_pr_url,
                    'head_branch' => $pullRequest->head_branch,
                    'files_changed' => $pullRequest->files_changed,
                    'label' => "PR #{$pullRequest->github_pr_number} aberto no GitHub",
                ]);
            });

        return $events;
    }
}
