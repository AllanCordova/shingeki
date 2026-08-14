<?php

namespace App\Services\Remediation\GitHub;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GitHubApiClient
{
    /**
     * @return array{sha: string}
     */
    public function getBranchSha(string $owner, string $repo, string $branch): array
    {
        $response = $this->request('GET', "/repos/{$owner}/{$repo}/git/ref/heads/{$branch}");

        return [
            'sha' => (string) $response->json('object.sha'),
        ];
    }

    public function resolveBaseBranch(string $owner, string $repo, ?string $preferred = null): string
    {
        $candidates = [];

        foreach ([$preferred, config('github.default_branch'), 'main', 'master'] as $branch) {
            if (! is_string($branch) || $branch === '') {
                continue;
            }

            if (! in_array($branch, $candidates, true)) {
                $candidates[] = $branch;
            }
        }

        foreach ($candidates as $branch) {
            try {
                $this->getBranchSha($owner, $repo, $branch);

                return $branch;
            } catch (RuntimeException $exception) {
                if (! $this->isNotFoundError($exception)) {
                    throw $exception;
                }
            }
        }

        throw new RuntimeException(
            'Could not resolve base branch for GitHub repository. Set GITHUB_DEFAULT_BRANCH (e.g. master).',
        );
    }

    /**
     * @param  list<string>  $paths
     * @return array{path: string, content: string, sha: string}
     */
    public function getFileContentFromCandidates(
        string $owner,
        string $repo,
        array $paths,
        string $ref,
    ): array {
        $lastError = null;

        foreach ($paths as $path) {
            try {
                $file = $this->getFileContent($owner, $repo, $path, $ref);

                return [
                    'path' => $path,
                    'content' => $file['content'],
                    'sha' => $file['sha'],
                ];
            } catch (RuntimeException $exception) {
                $lastError = $exception;

                if (! $this->isNotFoundError($exception)) {
                    throw $exception;
                }
            }
        }

        $attempted = implode(', ', $paths);

        throw new RuntimeException(
            "GitHub file not found. Tried: {$attempted}. Set GITHUB_REPOSITORY_SOURCE_PREFIX if the repo nests source code.",
            previous: $lastError,
        );
    }

    /**
     * Resolve file content and SHA for updates on an existing head branch.
     * Prefer the head branch ref so retries use the current blob SHA instead of a stale base-branch SHA.
     *
     * @param  list<string>  $paths
     * @return array{path: string, content: string, sha: string}
     */
    public function resolveFileForUpdate(
        string $owner,
        string $repo,
        array $paths,
        string $headBranch,
        string $baseBranch,
    ): array {
        try {
            return $this->getFileContentFromCandidates($owner, $repo, $paths, $headBranch);
        } catch (RuntimeException $exception) {
            if (! $this->isNotFoundError($exception)) {
                throw $exception;
            }
        }

        return $this->getFileContentFromCandidates($owner, $repo, $paths, $baseBranch);
    }

    public function createBranch(string $owner, string $repo, string $branchName, string $sha): void
    {
        try {
            $this->request('POST', "/repos/{$owner}/{$repo}/git/refs", [
                'ref' => "refs/heads/{$branchName}",
                'sha' => $sha,
            ]);
        } catch (RuntimeException $exception) {
            if (! str_contains($exception->getMessage(), 'Reference already exists')) {
                throw $exception;
            }
        }
    }

    public function ensureBranchAt(string $owner, string $repo, string $branchName, string $sha): void
    {
        try {
            $this->updateBranchRef($owner, $repo, $branchName, $sha);

            return;
        } catch (RuntimeException $exception) {
            if (! $this->isNotFoundError($exception)) {
                throw $exception;
            }
        }

        $this->createBranch($owner, $repo, $branchName, $sha);
    }

    public function updateBranchRef(string $owner, string $repo, string $branchName, string $sha): void
    {
        $this->request('PATCH', "/repos/{$owner}/{$repo}/git/refs/heads/{$branchName}", [
            'sha' => $sha,
            'force' => true,
        ]);
    }

    /**
     * @return array{content: string, sha: string}
     */
    public function getFileContent(string $owner, string $repo, string $path, string $ref): array
    {
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', ltrim($path, '/'))));
        $response = $this->request('GET', "/repos/{$owner}/{$repo}/contents/{$encodedPath}", [
            'ref' => $ref,
        ]);

        $encoded = (string) $response->json('content');
        $decoded = base64_decode(str_replace("\n", '', $encoded), true);

        if ($decoded === false) {
            throw new RuntimeException("Failed to decode GitHub file content for [{$path}].");
        }

        return [
            'content' => $decoded,
            'sha' => (string) $response->json('sha'),
        ];
    }

    public function updateFileContent(
        string $owner,
        string $repo,
        string $path,
        string $content,
        string $sha,
        string $branch,
        string $message,
    ): void {
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', ltrim($path, '/'))));

        $this->request('PUT', "/repos/{$owner}/{$repo}/contents/{$encodedPath}", [
            'message' => $message,
            'content' => base64_encode($content),
            'sha' => $sha,
            'branch' => $branch,
        ]);
    }

    /**
     * @return array{number: int, html_url: string}
     */
    public function createPullRequest(
        string $owner,
        string $repo,
        string $title,
        string $headBranch,
        string $baseBranch,
        string $body,
    ): array {
        $response = $this->request('POST', "/repos/{$owner}/{$repo}/pulls", [
            'title' => $title,
            'head' => $headBranch,
            'base' => $baseBranch,
            'body' => $body,
        ]);

        return [
            'number' => (int) $response->json('number'),
            'html_url' => (string) $response->json('html_url'),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function request(string $method, string $path, array $payload = []): Response
    {
        $token = config('github.token');

        if (! filled($token)) {
            throw new RuntimeException('GitHub token is not configured. Set GITHUB_TOKEN in the API environment.');
        }

        $url = config('github.api_base_url').$path;
        $timeout = (int) config('github.timeout_seconds', 30);

        $pending = Http::withToken((string) $token)
            ->accept('application/vnd.github+json')
            ->timeout($timeout);

        $response = match (strtoupper($method)) {
            'GET' => $pending->get($url, $payload),
            'POST' => $pending->post($url, $payload),
            'PUT' => $pending->put($url, $payload),
            'PATCH' => $pending->patch($url, $payload),
            default => throw new RuntimeException("Unsupported HTTP method [{$method}]."),
        };

        if ($response->failed()) {
            $status = $response->status();
            $upstream = $response->json('message') ?? $response->body();

            Log::warning('GitHub API request failed.', [
                'method' => $method,
                'path' => $path,
                'status' => $status,
            ]);

            throw new RuntimeException("GitHub API {$method} {$path} failed: {$upstream}");
        }

        return $response;
    }

    private function isNotFoundError(RuntimeException $exception): bool
    {
        $message = strtolower($exception->getMessage());

        return str_contains($message, 'not found')
            || str_contains($message, 'does not exist');
    }

    public function isFileNotFoundError(RuntimeException $exception): bool
    {
        return $this->isNotFoundError($exception);
    }

    /**
     * @return array{number: int, html_url: string}
     */
    public function findOpenPullRequestByHead(
        string $owner,
        string $repo,
        string $headBranch,
        string $baseBranch,
    ): array {
        $response = $this->request('GET', "/repos/{$owner}/{$repo}/pulls", [
            'head' => "{$owner}:{$headBranch}",
            'base' => $baseBranch,
            'state' => 'open',
            'per_page' => 1,
        ]);

        $pull = $response->json('0');

        if (! is_array($pull)) {
            throw new RuntimeException("No open pull request found for branch [{$headBranch}].");
        }

        return [
            'number' => (int) ($pull['number'] ?? 0),
            'html_url' => (string) ($pull['html_url'] ?? ''),
        ];
    }

    /**
     * @return array{number: int, html_url: string, compare_only?: bool}
     */
    public function createOrFindPullRequest(
        string $owner,
        string $repo,
        string $title,
        string $headBranch,
        string $baseBranch,
        string $body,
    ): array {
        try {
            return $this->createPullRequest($owner, $repo, $title, $headBranch, $baseBranch, $body);
        } catch (RuntimeException $exception) {
            $message = strtolower($exception->getMessage());

            if (str_contains($message, 'pull request already exists')) {
                return $this->findOpenPullRequestByHead($owner, $repo, $headBranch, $baseBranch);
            }

            try {
                return $this->findOpenPullRequestByHead($owner, $repo, $headBranch, $baseBranch);
            } catch (RuntimeException $findException) {
                if ($this->isPullRequestAccessError($exception) || $this->isPullRequestAccessError($findException)) {
                    return $this->compareUrlFallback($owner, $repo, $baseBranch, $headBranch);
                }

                throw $exception;
            }
        }
    }

    /**
     * @return array{number: int, html_url: string, compare_only: true}
     */
    public function compareUrlFallback(
        string $owner,
        string $repo,
        string $baseBranch,
        string $headBranch,
    ): array {
        return [
            'number' => 0,
            'html_url' => "https://github.com/{$owner}/{$repo}/compare/{$baseBranch}...{$headBranch}?expand=1",
            'compare_only' => true,
        ];
    }

    private function isPullRequestAccessError(RuntimeException $exception): bool
    {
        $message = strtolower($exception->getMessage());

        return str_contains($message, 'resource not accessible')
            || str_contains($message, 'not accessible by personal access token');
    }
}
