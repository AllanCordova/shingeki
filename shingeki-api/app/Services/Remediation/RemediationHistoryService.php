<?php

namespace App\Services\Remediation;

use App\Models\Remediation\AiRemediationSuggestion;
use App\Models\Remediation\GithubRemediationPullRequest;
use App\Models\Scanning\AttackDispatch;
use App\Models\Workspace\System;

class RemediationHistoryService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function timelineForSystem(System $system): array
    {
        $events = collect();

        $dispatches = AttackDispatch::query()
            ->where('system_id', $system->id)
            ->whereNotNull('completed_at')
            ->latest('completed_at')
            ->get(['id', 'completed_at', 'findings_count', 'scan_type', 'dispatched_at']);

        foreach ($dispatches as $dispatch) {
            $findings = $dispatch->findings_count ?? 0;
            $events->push([
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

        AiRemediationSuggestion::query()
            ->whereIn('attack_dispatch_id', $dispatches->pluck('id'))
            ->latest()
            ->get(['id', 'attack_dispatch_id', 'provider', 'model', 'created_at'])
            ->each(function (AiRemediationSuggestion $suggestion) use ($events) {
                $events->push([
                    'type' => 'ai_suggestion',
                    'occurred_at' => $suggestion->created_at,
                    'dispatch_id' => $suggestion->attack_dispatch_id,
                    'suggestion_id' => $suggestion->id,
                    'provider' => $suggestion->provider,
                    'model' => $suggestion->model,
                    'label' => 'IA sugeriu correcoes',
                ]);
            });

        GithubRemediationPullRequest::query()
            ->where('system_id', $system->id)
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

        return $events
            ->sortByDesc(fn (array $event) => $event['occurred_at'])
            ->take(200)
            ->values()
            ->all();
    }
}
