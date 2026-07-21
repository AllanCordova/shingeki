<?php

namespace App\Services\Source;

use App\Models\System\System;
use App\Models\System\SystemResult;

class DastRouteHeuristic
{
    /**
     * Maps common DAST routes to likely source files (vanilla PHP lab and similar).
     *
     * @return array{file: string, line: int}|null
     */
    public function resolve(System $system, SystemResult $result): ?array
    {
        $route = $result->vulnerable_route;

        if ($route === null || $route === '') {
            return null;
        }

        $path = parse_url($route, PHP_URL_PATH) ?? $route;
        $path = '/'.ltrim($path, '/');

        $file = match (true) {
            str_starts_with($path, '/login') => 'login.php',
            str_contains($path, 'search') => 'search.php',
            str_contains($path, 'browse') => 'browse.php',
            default => $this->basenameFromPath($path),
        };

        if ($file === null) {
            return null;
        }

        $system->loadMissing('stacks');
        $hasPhpStack = $system->stacks->contains(
            fn ($stack) => in_array('php', $stack->languages ?? [], true)
                || in_array($stack->slug, ['vanilla_php', 'laravel'], true),
        );

        if (! $hasPhpStack) {
            return null;
        }

        return [
            'file' => $file,
            'line' => 1,
        ];
    }

    private function basenameFromPath(string $path): ?string
    {
        $basename = basename($path);

        if (str_contains($basename, '.php')) {
            return $basename;
        }

        return null;
    }
}
