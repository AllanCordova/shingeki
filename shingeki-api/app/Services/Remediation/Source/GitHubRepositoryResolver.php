<?php

namespace App\Services\Remediation\Source;

use InvalidArgumentException;

class GitHubRepositoryResolver
{
    /**
     * @return array{owner: string, repo: string}|null
     */
    public function parse(string $repositoryUrl): ?array
    {
        $repositoryUrl = trim($repositoryUrl);

        if ($repositoryUrl === '') {
            return null;
        }

        $scheme = strtolower((string) parse_url($repositoryUrl, PHP_URL_SCHEME));
        $host = strtolower((string) parse_url($repositoryUrl, PHP_URL_HOST));
        $path = parse_url($repositoryUrl, PHP_URL_PATH);

        if ($scheme !== 'https' || ! is_string($path) || $path === '') {
            return null;
        }

        $allowedHosts = config('github.allowed_hosts', ['github.com', 'www.github.com']);

        if (! in_array($host, $allowedHosts, true)) {
            return null;
        }

        $segments = array_values(array_filter(explode('/', trim($path, '/'))));

        if (count($segments) < 2) {
            return null;
        }

        $owner = $segments[0];
        $repo = preg_replace('/\.git$/', '', $segments[1]) ?? $segments[1];

        return [
            'owner' => $owner,
            'repo' => $repo,
        ];
    }

    /**
     * @param  array{owner: string, repo: string}  $coordinates
     */
    public function assertAllowed(array $coordinates): void
    {
        $ownerRepo = strtolower($coordinates['owner'].'/'.$coordinates['repo']);
        $allowlist = config('github.allowed_repositories', []);
        $require = (bool) config('github.require_repository_allowlist', false);

        if ($require && $allowlist === []) {
            throw new InvalidArgumentException('GitHub repository allowlist is not configured.');
        }

        if ($allowlist !== [] && ! in_array($ownerRepo, $allowlist, true)) {
            throw new InvalidArgumentException('GitHub repository is not authorized for this server token.');
        }
    }

    public function rawFileUrl(string $owner, string $repo, string $branch, string $filePath): string
    {
        $filePath = ltrim(str_replace('\\', '/', $filePath), '/');

        return "https://raw.githubusercontent.com/{$owner}/{$repo}/{$branch}/{$filePath}";
    }
}
