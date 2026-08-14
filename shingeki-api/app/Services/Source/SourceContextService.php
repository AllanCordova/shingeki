<?php

namespace App\Services\Source;

use App\Enums\Attack\AttackScanType;
use App\Models\System\System;
use App\Models\System\SystemResult;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class SourceContextService
{
    public function __construct(
        private readonly GitHubRepositoryResolver $repositoryResolver,
        private readonly DastRouteHeuristic $dastRouteHeuristic,
    ) {}

    public function resolve(System $system, SystemResult $result): SourceContext
    {
        $result->loadMissing('attackDispatch');

        $parsed = $this->parseVulnerableRoute($result->vulnerable_route);

        if ($parsed !== null && filled($system->repository_url)) {
            $fromRepo = $this->fetchFromRepository(
                $system->repository_url,
                $parsed['file'],
                $parsed['line'],
            );

            if ($fromRepo !== null) {
                return $fromRepo;
            }
        }

        $scanType = $result->attackDispatch?->scan_type;

        if ($scanType === AttackScanType::Dast && filled($system->repository_url)) {
            $heuristic = $this->dastRouteHeuristic->resolve($system, $result);

            if ($heuristic !== null) {
                $fromRepo = $this->fetchFromRepository(
                    $system->repository_url,
                    $heuristic['file'],
                    $heuristic['line'],
                );

                if ($fromRepo !== null) {
                    return new SourceContext(
                        excerpt: $fromRepo->excerpt,
                        file: $heuristic['file'],
                        line: $heuristic['line'],
                        origin: 'dast_heuristic',
                    );
                }
            }
        }

        return $this->fallbackFromEvidence(
            $result,
            $parsed['file'] ?? null,
            $parsed['line'] ?? null,
        );
    }

    /**
     * @return array{file: string, line: int}|null
     */
    private function parseVulnerableRoute(?string $vulnerableRoute): ?array
    {
        if ($vulnerableRoute === null || $vulnerableRoute === '') {
            return null;
        }

        if (! str_contains($vulnerableRoute, ':')) {
            return null;
        }

        $position = strrpos($vulnerableRoute, ':');
        $file = substr($vulnerableRoute, 0, $position);
        $line = substr($vulnerableRoute, $position + 1);

        if ($file === '' || ! ctype_digit($line)) {
            return null;
        }

        return [
            'file' => $file,
            'line' => (int) $line,
        ];
    }

    private function fetchFromRepository(string $repositoryUrl, string $filePath, int $line): ?SourceContext
    {
        $coordinates = $this->repositoryResolver->parse($repositoryUrl);

        if ($coordinates === null) {
            return null;
        }

        $branch = (string) config('ai.source_context.default_branch', 'main');
        $cacheKey = 'source:'.md5($repositoryUrl.'|'.$filePath.'|'.$branch);
        $ttl = (int) config('ai.source_context.cache_ttl_seconds', 3600);

        $content = Cache::remember($cacheKey, $ttl, function () use ($coordinates, $branch, $filePath) {
            $url = $this->repositoryResolver->rawFileUrl(
                $coordinates['owner'],
                $coordinates['repo'],
                $branch,
                $filePath,
            );

            $response = Http::timeout(15)->get($url);

            if (! $response->successful()) {
                $fallbackBranch = $branch === 'main' ? 'master' : 'main';
                $fallbackUrl = $this->repositoryResolver->rawFileUrl(
                    $coordinates['owner'],
                    $coordinates['repo'],
                    $fallbackBranch,
                    $filePath,
                );
                $response = Http::timeout(15)->get($fallbackUrl);
            }

            if (! $response->successful()) {
                return null;
            }

            return $response->body();
        });

        if (! is_string($content) || $content === '') {
            return null;
        }

        return new SourceContext(
            excerpt: $this->windowAroundLine($content, $line),
            file: $filePath,
            line: $line,
            origin: 'repository',
        );
    }

    private function windowAroundLine(string $content, int $line): string
    {
        $lines = preg_split("/\r\n|\n|\r/", $content) ?: [];
        $window = (int) config('ai.source_context.line_window', 40);
        $index = max(0, $line - 1);
        $start = max(0, $index - $window);
        $end = min(count($lines) - 1, $index + $window);

        $slice = array_slice($lines, $start, $end - $start + 1, true);
        $numbered = [];

        foreach ($slice as $lineNumber => $text) {
            $numbered[] = sprintf('%5d | %s', $lineNumber + 1, $text);
        }

        return implode("\n", $numbered);
    }

    private function fallbackFromEvidence(
        SystemResult $result,
        ?string $file,
        ?int $line,
    ): SourceContext {
        $parts = array_filter([
            $result->evidence,
            $result->http_request,
        ]);

        return new SourceContext(
            excerpt: $parts !== [] ? implode("\n\n", $parts) : 'No source context available.',
            file: $file,
            line: $line,
            origin: 'evidence',
        );
    }
}
