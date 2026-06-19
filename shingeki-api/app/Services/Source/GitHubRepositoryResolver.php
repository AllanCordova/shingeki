<?php

namespace App\Services\Source;

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

        $path = parse_url($repositoryUrl, PHP_URL_PATH);

        if (! is_string($path) || $path === '') {
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

    public function rawFileUrl(string $owner, string $repo, string $branch, string $filePath): string
    {
        $filePath = ltrim(str_replace('\\', '/', $filePath), '/');

        return "https://raw.githubusercontent.com/{$owner}/{$repo}/{$branch}/{$filePath}";
    }
}
