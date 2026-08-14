<?php

namespace App\Services\Remediation\GitHub;

use App\Enums\Scanning\AttackScanType;
use App\Models\Identity\User;
use App\Models\Remediation\GithubRemediationPullRequest;
use App\Models\Scanning\AttackDispatch;
use App\Models\Scanning\SystemResult;
use App\Models\Workspace\System;
use App\Services\Remediation\Ai\AiRemediationService;
use App\Services\Remediation\Ai\SnippetSyntaxValidator;
use App\Services\Remediation\CodePatchApplier;
use App\Services\Remediation\FindingLocation;
use App\Services\Remediation\FindingLocationResolver;
use App\Services\Remediation\Source\GitHubRepositoryResolver;
use App\Services\Remediation\Source\SourceFileNormalizer;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use RuntimeException;

class GitHubRemediationService
{
    public function __construct(
        private readonly GitHubRepositoryResolver $repositoryResolver,
        private readonly GitHubApiClient $githubApi,
        private readonly AiRemediationService $aiRemediationService,
        private readonly FindingLocationResolver $locationResolver,
        private readonly CodePatchApplier $patchApplier,
        private readonly SnippetSyntaxValidator $syntaxValidator,
    ) {}

    /**
     * @param  list<string>  $findingIds
     * @return array{
     *   pull_request: array<string, mixed>,
     *   files_changed: int,
     *   findings_applied: int,
     *   skipped_files: list<array{scan_path: string, reason: string}>,
     *   warnings: list<string>,
     *   provider: string,
     *   model: string
     * }
     */
    public function openPullRequest(
        System $system,
        AttackDispatch $dispatch,
        User $user,
        array $findingIds,
        bool $regenerate = false,
        ?string $title = null,
        ?string $baseBranch = null,
    ): array {
        $plan = $this->buildRemediationPlan($system, $dispatch, $findingIds, $regenerate);

        $owner = $plan['owner'];
        $repo = $plan['repo'];
        $generated = $plan['generated'];
        $patchesByFile = $plan['patches_by_file'];
        $baseBranch = $this->githubApi->resolveBaseBranch($owner, $repo, $baseBranch);
        $headBranch = $this->buildBranchName($dispatch->id);

        $baseSha = $this->githubApi->getBranchSha($owner, $repo, $baseBranch)['sha'];
        $this->githubApi->ensureBranchAt($owner, $repo, $headBranch, $baseSha);

        $processed = $this->processRemediationFiles(
            $owner,
            $repo,
            $baseBranch,
            $headBranch,
            $patchesByFile,
            commit: true,
        );

        $filesChanged = $processed['files_changed'];
        $findingsApplied = $processed['findings_applied'];
        $skippedFiles = $processed['skipped_files'];

        if ($filesChanged === 0) {
            $details = implode('; ', array_map(
                static fn (array $entry): string => $entry['scan_path'].' ('.$entry['reason'].')',
                $skippedFiles,
            ));

            throw new InvalidArgumentException(
                'No findings could be safely remediated. '.$details,
            );
        }

        $warnings = [];

        if ($skippedFiles !== []) {
            $warnings[] = sprintf(
                '%d file(s) were skipped because they are not present in the GitHub repository.',
                count($skippedFiles),
            );
        }

        $prTitle = $title ?? sprintf(
            'fix(security): remediate %d finding(s) from Shingeki SAST scan',
            count($findingIds),
        );

        $prBody = $this->buildPullRequestBody($dispatch, $generated['findings'], $patchesByFile);

        $pullRequest = $this->githubApi->createOrFindPullRequest(
            $owner,
            $repo,
            $prTitle,
            $headBranch,
            $baseBranch,
            $prBody,
        );

        if ($pullRequest['compare_only'] ?? false) {
            $warnings[] = 'Commits were pushed to GitHub, but the token cannot open pull requests via API. Use the compare link to open the PR manually. For fine-grained tokens, enable Pull requests: Read and write.';
        }

        $existing = GithubRemediationPullRequest::query()
            ->where('system_id', $system->id)
            ->where('attack_dispatch_id', $dispatch->id)
            ->first();

        $mergedFindingIds = array_values(array_unique([
            ...($existing?->finding_ids ?? []),
            ...$findingIds,
        ]));

        $record = GithubRemediationPullRequest::query()->updateOrCreate(
            [
                'system_id' => $system->id,
                'attack_dispatch_id' => $dispatch->id,
            ],
            [
                'user_id' => $user->id,
                'github_pr_number' => $pullRequest['number'],
                'github_pr_url' => $pullRequest['html_url'],
                'head_branch' => $headBranch,
                'base_branch' => $baseBranch,
                'finding_ids' => $mergedFindingIds,
                'files_changed' => ($existing?->files_changed ?? 0) + $filesChanged,
            ],
        );

        return [
            'pull_request' => [
                'id' => $record->id,
                'number' => $record->github_pr_number,
                'url' => $record->github_pr_url,
                'head_branch' => $record->head_branch,
                'base_branch' => $record->base_branch,
                'compare_only' => $pullRequest['compare_only'] ?? false,
            ],
            'files_changed' => $filesChanged,
            'findings_applied' => $findingsApplied,
            'skipped_files' => $skippedFiles,
            'warnings' => $warnings,
            'provider' => $generated['provider'],
            'model' => $generated['model'],
        ];
    }

    /**
     * @param  list<string>  $findingIds
     * @return array{
     *   repository: array{owner: string, repo: string, url: string},
     *   pull_request: array{title: string, body: string, head_branch: string, base_branch: string},
     *   files: list<array<string, mixed>>,
     *   files_ready: int,
     *   findings_applied: int,
     *   skipped_files: list<array{scan_path: string, reason: string}>,
     *   warnings: list<string>,
     *   can_submit: bool,
     *   provider: string,
     *   model: string
     * }
     */
    public function previewPullRequest(
        System $system,
        AttackDispatch $dispatch,
        array $findingIds,
        bool $regenerate = false,
        ?string $title = null,
        ?string $baseBranch = null,
    ): array {
        $plan = $this->buildRemediationPlan($system, $dispatch, $findingIds, $regenerate);

        $owner = $plan['owner'];
        $repo = $plan['repo'];
        $baseBranch = $this->githubApi->resolveBaseBranch($owner, $repo, $baseBranch ?? $plan['base_branch']);
        $headBranch = $this->buildBranchName($dispatch->id);

        $processed = $this->processRemediationFiles(
            $owner,
            $repo,
            $baseBranch,
            null,
            $plan['patches_by_file'],
            commit: false,
        );

        $warnings = [];

        if ($processed['skipped_files'] !== []) {
            $warnings[] = sprintf(
                '%d file(s) will be skipped because they cannot be patched safely or are missing from the repository.',
                count($processed['skipped_files']),
            );
        }

        $prTitle = $title ?? sprintf(
            'fix(security): remediate %d finding(s) from Shingeki SAST scan',
            count($findingIds),
        );

        $prBody = $this->buildPullRequestBody(
            $dispatch,
            $plan['generated']['findings'],
            $plan['patches_by_file'],
        );

        return [
            'repository' => [
                'owner' => $owner,
                'repo' => $repo,
                'url' => (string) $system->repository_url,
            ],
            'pull_request' => [
                'title' => $prTitle,
                'body' => $prBody,
                'head_branch' => $headBranch,
                'base_branch' => $baseBranch,
            ],
            'files' => $processed['files'],
            'files_ready' => $processed['files_changed'],
            'findings_applied' => $processed['findings_applied'],
            'skipped_files' => $processed['skipped_files'],
            'warnings' => $warnings,
            'can_submit' => $processed['files_changed'] > 0,
            'provider' => $plan['generated']['provider'],
            'model' => $plan['generated']['model'],
        ];
    }

    /**
     * @param  list<string>  $findingIds
     * @return array{
     *   owner: string,
     *   repo: string,
     *   base_branch: string|null,
     *   results: Collection<int, SystemResult>,
     *   generated: array{findings: list<array<string, mixed>>, provider: string, model: string},
     *   patches_by_file: array<string, list<array{location: FindingLocation, replacement: string}>>
     * }
     */
    private function buildRemediationPlan(
        System $system,
        AttackDispatch $dispatch,
        array $findingIds,
        bool $regenerate,
    ): array {
        if (blank($system->repository_url)) {
            throw new InvalidArgumentException('System repository_url is required to open a GitHub pull request.');
        }

        if ($dispatch->scan_type !== AttackScanType::Sast) {
            throw new InvalidArgumentException('GitHub remediation pull requests are supported for SAST dispatches only.');
        }

        $coordinates = $this->repositoryResolver->parse((string) $system->repository_url);

        if ($coordinates === null) {
            throw new InvalidArgumentException('System repository_url is not a supported GitHub repository URL.');
        }

        $this->repositoryResolver->assertAllowed($coordinates);

        $results = SystemResult::query()
            ->with(['attack', 'attackDispatch'])
            ->where('system_id', $system->id)
            ->where('attack_dispatch_id', $dispatch->id)
            ->whereIn('id', $findingIds)
            ->get();

        if ($results->count() !== count($findingIds)) {
            throw new InvalidArgumentException('One or more finding_ids are invalid for the selected dispatch.');
        }

        $generated = $this->aiRemediationService->generate(
            $system,
            $dispatch,
            $results,
            $findingIds,
            $regenerate,
        );

        $patchesByFile = $this->buildPatchesByFile($results, $generated['findings']);

        if ($patchesByFile === []) {
            throw new InvalidArgumentException('No patchable findings with valid AI suggestions were available.');
        }

        return [
            'owner' => $coordinates['owner'],
            'repo' => $coordinates['repo'],
            'base_branch' => null,
            'results' => $results,
            'generated' => $generated,
            'patches_by_file' => $patchesByFile,
        ];
    }

    /**
     * @param  array<string, list<array{location: FindingLocation, replacement: string}>>  $patchesByFile
     * @return array{
     *   files: list<array<string, mixed>>,
     *   files_changed: int,
     *   findings_applied: int,
     *   skipped_files: list<array{scan_path: string, reason: string}>
     * }
     */
    private function processRemediationFiles(
        string $owner,
        string $repo,
        string $baseBranch,
        ?string $headBranch,
        array $patchesByFile,
        bool $commit,
    ): array {
        $filesChanged = 0;
        $findingsApplied = 0;
        /** @var list<array{scan_path: string, reason: string}> $skippedFiles */
        $skippedFiles = [];
        /** @var list<array<string, mixed>> $files */
        $files = [];

        foreach ($patchesByFile as $scanFilePath => $operations) {
            $changes = array_map(
                static fn (array $operation): array => [
                    'start_line' => $operation['location']->startLine,
                    'end_line' => $operation['location']->endLineOrStart(),
                    'replacement' => $operation['replacement'],
                ],
                $operations,
            );

            try {
                $file = $this->githubApi->getFileContentFromCandidates(
                    $owner,
                    $repo,
                    $this->filePathCandidates($scanFilePath),
                    $baseBranch,
                );
            } catch (RuntimeException $exception) {
                if ($this->githubApi->isFileNotFoundError($exception)) {
                    $reason = 'File is not present in the GitHub repository.';
                    $skippedFiles[] = [
                        'scan_path' => $scanFilePath,
                        'reason' => $reason,
                    ];
                    $files[] = [
                        'path' => $scanFilePath,
                        'github_path' => null,
                        'status' => 'skipped',
                        'reason' => $reason,
                        'findings_count' => count($operations),
                        'before' => null,
                        'after' => null,
                        'changes' => $changes,
                    ];

                    continue;
                }

                throw $exception;
            }

            $beforeContent = $file['content'];
            $content = $beforeContent;
            $githubPath = $file['path'];
            $sha = $file['sha'];

            foreach ($operations as $operation) {
                $content = $this->patchApplier->apply(
                    $content,
                    $operation['location'],
                    $operation['replacement'],
                );
            }

            if (! $this->syntaxValidator->validatePhpFile($content)) {
                $reason = 'Patched file failed PHP syntax validation and was not committed.';
                $skippedFiles[] = [
                    'scan_path' => $scanFilePath,
                    'reason' => $reason,
                ];
                $files[] = [
                    'path' => $scanFilePath,
                    'github_path' => $githubPath,
                    'status' => 'skipped',
                    'reason' => $reason,
                    'findings_count' => count($operations),
                    'before' => $beforeContent,
                    'after' => $content,
                    'changes' => $changes,
                ];

                continue;
            }

            $residualReason = $this->verifyPatchRemovedVulnerability($content, $operations);

            if ($residualReason !== null) {
                $skippedFiles[] = [
                    'scan_path' => $scanFilePath,
                    'reason' => $residualReason,
                ];
                $files[] = [
                    'path' => $scanFilePath,
                    'github_path' => $githubPath,
                    'status' => 'skipped',
                    'reason' => $residualReason,
                    'findings_count' => count($operations),
                    'before' => $beforeContent,
                    'after' => $content,
                    'changes' => $changes,
                ];

                continue;
            }

            if ($commit) {
                if ($headBranch === null) {
                    throw new InvalidArgumentException('head_branch is required when committing remediation files.');
                }

                $this->githubApi->updateFileContent(
                    $owner,
                    $repo,
                    $githubPath,
                    $content,
                    $sha,
                    $headBranch,
                    "fix(security): remediate findings in {$githubPath}",
                );
            }

            $filesChanged++;
            $findingsApplied += count($operations);
            $files[] = [
                'path' => $scanFilePath,
                'github_path' => $githubPath,
                'status' => 'ready',
                'reason' => null,
                'findings_count' => count($operations),
                'before' => $beforeContent,
                'after' => $content,
                'changes' => $changes,
            ];
        }

        return [
            'files' => $files,
            'files_changed' => $filesChanged,
            'findings_applied' => $findingsApplied,
            'skipped_files' => $skippedFiles,
        ];
    }

    /**
     * @param  Collection<int, SystemResult>  $results
     * @param  list<array<string, mixed>>  $aiFindings
     * @return array<string, list<array{location: FindingLocation, replacement: string}>>
     */
    private function buildPatchesByFile(Collection $results, array $aiFindings): array
    {
        $aiByResultId = collect($aiFindings)->keyBy('system_result_id');
        $patchesByFile = [];

        foreach ($results as $result) {
            $aiFinding = $aiByResultId->get($result->id);

            if (! is_array($aiFinding)) {
                continue;
            }

            $aiSuggestion = $aiFinding['ai_suggestion'] ?? null;

            if (! is_array($aiSuggestion)) {
                continue;
            }

            if (! ($aiSuggestion['validation']['syntax_valid'] ?? false)) {
                continue;
            }

            $replacement = trim((string) ($aiSuggestion['suggested_fix']['code'] ?? ''));

            if ($replacement === '') {
                continue;
            }

            $location = $this->locationResolver->resolve($result);

            if ($location === null) {
                $file = $aiSuggestion['location']['file'] ?? $aiFinding['source_context']['file'] ?? null;
                $line = $aiSuggestion['location']['line'] ?? $aiFinding['source_context']['line'] ?? null;

                if (! is_string($file) || $file === '' || ! is_int($line)) {
                    continue;
                }

                $location = new FindingLocation(
                    file: ltrim(str_replace('\\', '/', $file), '/'),
                    startLine: $line,
                    endLine: $line,
                    matchedSnippet: $result->matched_snippet,
                );
            }

            $patchesByFile[$location->file][] = [
                'location' => $location,
                'replacement' => $replacement,
            ];
        }

        foreach ($patchesByFile as $file => $operations) {
            $operations = $this->mergeDuplicateReplacements($operations);
            usort($operations, fn (array $a, array $b) => $b['location']->startLine <=> $a['location']->startLine);
            $patchesByFile[$file] = $operations;
        }

        return $patchesByFile;
    }

    /**
     * When several findings in the same file resolve to the identical AI fix
     * (e.g. two tainted-filename hits that share one corrected block), applying
     * each operation would duplicate the block. Collapse them into a single
     * range replacement spanning every affected line so the block lands once.
     *
     * @param  list<array{location: FindingLocation, replacement: string}>  $operations
     * @return list<array{location: FindingLocation, replacement: string}>
     */
    private function mergeDuplicateReplacements(array $operations): array
    {
        /** @var array<string, array{location: FindingLocation, replacement: string}> $merged */
        $merged = [];

        foreach ($operations as $operation) {
            $key = preg_replace('/\s+/', ' ', trim($operation['replacement'])) ?? $operation['replacement'];

            if (! isset($merged[$key])) {
                $merged[$key] = $operation;

                continue;
            }

            $existing = $merged[$key]['location'];
            $incoming = $operation['location'];

            $merged[$key] = [
                'location' => new FindingLocation(
                    file: $existing->file,
                    startLine: min($existing->startLine, $incoming->startLine),
                    endLine: max($existing->endLineOrStart(), $incoming->endLineOrStart()),
                    matchedSnippet: null,
                ),
                'replacement' => $merged[$key]['replacement'],
            ];
        }

        return array_values($merged);
    }

    /**
     * Reject patches that did not actually remove the vulnerability so we never
     * commit (and claim success for) a fix that SAST will keep flagging.
     *
     * @param  list<array{location: FindingLocation, replacement: string}>  $operations
     */
    private function verifyPatchRemovedVulnerability(string $content, array $operations): ?string
    {
        foreach ($operations as $operation) {
            $snippet = $operation['location']->matchedSnippet;
            $replacement = trim($operation['replacement']);

            if (is_string($snippet) && trim($snippet) !== '') {
                if ($this->patchApplier->occurrences($content, $snippet) > 0) {
                    return 'AI fix did not remove the vulnerable code (the flagged snippet is still present). Fix this finding manually.';
                }

                $orphan = $this->orphanVariable($snippet, $replacement, $content);

                if ($orphan !== null) {
                    return "AI fix removed the assignment of {$orphan} but left a dangling use of {$orphan} (e.g. db()->exec({$orphan})). The vulnerable sink survives. Fix this finding manually.";
                }
            }

            if (strlen($replacement) >= 12
                && $this->patchApplier->occurrences($content, $replacement) > 1
            ) {
                return 'AI fix produced duplicated code blocks and was not committed. Fix this finding manually.';
            }
        }

        return null;
    }

    /**
     * Detect a variable that the flagged snippet assigned, the replacement dropped,
     * but the patched file still references (a half-applied fix leaving the sink).
     */
    private function orphanVariable(string $snippet, string $replacement, string $content): ?string
    {
        foreach ($this->assignedVariables($snippet) as $variable) {
            if ($this->variableIsUsed($replacement, $variable)) {
                continue;
            }

            if ($this->variableIsUsed($content, $variable)) {
                return $variable;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function assignedVariables(string $snippet): array
    {
        if (preg_match_all('/(\$[a-zA-Z_]\w*)\s*=(?!=)/', $snippet, $matches) === false) {
            return [];
        }

        return array_values(array_unique($matches[1]));
    }

    private function variableIsUsed(string $code, string $variable): bool
    {
        return preg_match('/'.preg_quote($variable, '/').'(?![a-zA-Z0-9_])/', $code) === 1;
    }

    private function buildBranchName(string $dispatchId): string
    {
        $prefix = (string) config('github.branch_prefix', 'fix-security');
        $suffix = substr(str_replace('-', '', $dispatchId), 0, 8);

        return "{$prefix}-{$suffix}";
    }

    /**
     * @return list<string>
     */
    private function filePathCandidates(string $scanFilePath): array
    {
        $normalized = SourceFileNormalizer::normalize($scanFilePath)
            ?? ltrim(str_replace('\\', '/', $scanFilePath), '/');
        $prefix = trim((string) config('github.repository_source_prefix', ''), '/');

        if ($prefix !== '' && ! str_starts_with($normalized, $prefix.'/')) {
            return array_values(array_unique([$prefix.'/'.$normalized, $normalized]));
        }

        return [$normalized];
    }

    /**
     * @param  list<array<string, mixed>>  $aiFindings
     * @param  array<string, list<array{location: FindingLocation, replacement: string}>>  $patchesByFile
     */
    private function buildPullRequestBody(
        AttackDispatch $dispatch,
        array $aiFindings,
        array $patchesByFile,
    ): string {
        $lines = [
            '## Security remediation (Shingeki)',
            '',
            'Automated fixes generated from AI remediation suggestions for a completed SAST scan.',
            '',
            '**Dispatch:** `'.$dispatch->id.'`',
            '',
            '### Files changed',
            '',
        ];

        foreach (array_keys($patchesByFile) as $file) {
            $lines[] = '- `'.$file.'`';
        }

        $lines[] = '';
        $lines[] = '### Findings';
        $lines[] = '';

        foreach ($aiFindings as $finding) {
            $route = $finding['vulnerable_route'] ?? 'unknown';
            $summary = $finding['ai_suggestion']['risk_summary'] ?? $finding['ai_suggestion']['root_cause'] ?? 'Security finding';
            $lines[] = '- `'.$route.'` — '.$summary;
        }

        $lines[] = '';
        $lines[] = '_Review carefully before merging. AI-generated patches may require manual adjustment._';

        return implode("\n", $lines);
    }
}
