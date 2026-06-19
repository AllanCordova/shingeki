<?php

namespace App\Services\ManualProxy;

use App\Models\System;
use App\Services\Attack\WorkerTargetUrlResolver;
use InvalidArgumentException;

class ManualProxyUrlGuard
{
    public function __construct(
        private readonly WorkerTargetUrlResolver $targetUrlResolver,
    ) {}

    public function resolve(System $system, string $path): string
    {
        $path = trim($path);

        if ($path === '' || ! str_starts_with($path, '/')) {
            throw new InvalidArgumentException('Path must start with /.');
        }

        $pathParts = parse_url($path);
        if ($pathParts === false) {
            throw new InvalidArgumentException('Path is invalid.');
        }

        if (isset($pathParts['host'])) {
            throw new InvalidArgumentException('Path must be relative to the system target URL.');
        }

        $base = rtrim($this->targetUrlResolver->forManualProxy($system->target_url), '/');
        $baseParts = parse_url($base);
        if ($baseParts === false || ! isset($baseParts['host'])) {
            throw new InvalidArgumentException('System target URL is invalid.');
        }

        $url = $base.$path;
        $resolved = parse_url($url);
        if ($resolved === false || ! isset($resolved['host'])) {
            throw new InvalidArgumentException('Resolved URL is invalid.');
        }

        if (strtolower((string) $resolved['host']) !== strtolower((string) $baseParts['host'])) {
            throw new InvalidArgumentException('Request URL must stay on the system target host.');
        }

        if (strtolower((string) ($resolved['scheme'] ?? 'http')) !== strtolower((string) ($baseParts['scheme'] ?? 'http'))) {
            throw new InvalidArgumentException('Request URL must use the system target scheme.');
        }

        return $url;
    }
}
