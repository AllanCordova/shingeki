<?php

namespace App\Services\Attack;

class WorkerTargetUrlResolver
{
    /**
     * URL reachable by the DAST worker (Docker network / host gateway).
     * The system target_url stays browser-friendly (localhost, 127.0.0.1).
     */
    public function forWorker(string $targetUrl): string
    {
        $targetUrl = rtrim(trim($targetUrl), '/');

        $workerOverride = config('attacks.vulnerable_target_worker_url');
        if (is_string($workerOverride) && $workerOverride !== '') {
            $canonical = rtrim((string) config('attacks.vulnerable_target_url'), '/');
            if ($this->refersToSameLabTarget($targetUrl, $canonical)) {
                return rtrim($workerOverride, '/');
            }
        }

        $rewriteHost = config('attacks.target_localhost_rewrite');
        if (is_string($rewriteHost) && $rewriteHost !== '') {
            return $this->rewriteLocalhostHost($targetUrl, $rewriteHost);
        }

        return $targetUrl;
    }

    public function forManualProxy(string $targetUrl): string
    {
        $targetUrl = rtrim(trim($targetUrl), '/');

        $canonical = rtrim((string) config('attacks.vulnerable_target_url'), '/');
        $workerOverride = config('attacks.vulnerable_target_worker_url');

        if (
            is_string($workerOverride)
            && $workerOverride !== ''
            && $canonical !== ''
            && $this->refersToSameLabTarget($targetUrl, rtrim($workerOverride, '/'))
        ) {
            return $canonical;
        }

        return $targetUrl;
    }

    private function refersToSameLabTarget(string $left, string $right): bool
    {
        if ($left === '' || $right === '') {
            return false;
        }

        return $this->normalizeForComparison($left) === $this->normalizeForComparison($right);
    }

    private function normalizeForComparison(string $url): string
    {
        $parts = parse_url($url);
        if ($parts === false || ! isset($parts['host'])) {
            return strtolower($url);
        }

        $host = strtolower((string) $parts['host']);
        $labHosts = ['localhost', '127.0.0.1', 'host.docker.internal', 'vulnerable-target'];
        if (! in_array($host, $labHosts, true)) {
            return strtolower($url);
        }

        if ($host === '127.0.0.1') {
            $host = 'localhost';
        }
        if ($host === 'host.docker.internal' || $host === 'vulnerable-target') {
            $host = 'localhost';
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? 'http'));
        $port = $parts['port'] ?? null;
        $path = $parts['path'] ?? '';

        if ($port === null) {
            $port = $scheme === 'https' ? '443' : '80';
        }

        return $scheme.'://'.$host.':'.$port.rtrim($path, '/');
    }

    private function rewriteLocalhostHost(string $url, string $rewriteHost): string
    {
        $parts = parse_url($url);
        if ($parts === false || ! isset($parts['host'])) {
            return $url;
        }

        $host = strtolower((string) $parts['host']);
        if (! in_array($host, ['localhost', '127.0.0.1'], true)) {
            return $url;
        }

        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $parts['host'] = $rewriteHost;

        return $this->buildUrl($parts);
    }

    /**
     * @param  array<string, mixed>  $parts
     */
    private function buildUrl(array $parts): string
    {
        $scheme = $parts['scheme'] ?? 'http';
        $host = $parts['host'] ?? '';
        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $path = $parts['path'] ?? '';
        $query = isset($parts['query']) ? '?'.$parts['query'] : '';
        $fragment = isset($parts['fragment']) ? '#'.$parts['fragment'] : '';

        return $scheme.'://'.$host.$port.$path.$query.$fragment;
    }
}
