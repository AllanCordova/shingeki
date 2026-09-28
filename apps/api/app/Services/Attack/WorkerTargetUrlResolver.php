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

        $rewriteHost = config('attacks.target_localhost_rewrite');
        if (is_string($rewriteHost) && $rewriteHost !== '') {
            return $this->rewriteLocalhostHost($targetUrl, $rewriteHost);
        }

        return $targetUrl;
    }

    public function forManualProxy(string $targetUrl): string
    {
        return rtrim(trim($targetUrl), '/');
    }

    public function rewritePublicText(string $text, string $browserTargetUrl): string
    {
        if ($text === '') {
            return $text;
        }

        $browserTargetUrl = rtrim(trim($browserTargetUrl), '/');
        if ($browserTargetUrl === '') {
            return $text;
        }

        $workerUrl = rtrim($this->forWorker($browserTargetUrl), '/');
        if ($workerUrl !== '' && $workerUrl !== $browserTargetUrl) {
            $text = str_replace($workerUrl, $browserTargetUrl, $text);
        }

        $fromHost = $this->hostWithPort($workerUrl);
        $toHost = $this->hostWithPort($browserTargetUrl);
        if ($fromHost !== '' && $toHost !== '' && $fromHost !== $toHost) {
            $text = str_replace($fromHost, $toHost, $text);
        }

        $toHostName = $this->hostOnly($browserTargetUrl);
        if ($toHostName !== '') {
            foreach (['host.docker.internal'] as $workerHost) {
                if (strcasecmp($workerHost, $toHostName) === 0) {
                    continue;
                }
                $text = str_ireplace($workerHost, $toHostName, $text);
            }
        }

        return $text;
    }

    private function hostWithPort(string $url): string
    {
        $host = $this->hostOnly($url);
        if ($host === '') {
            return '';
        }

        $parts = parse_url($url);
        if (is_array($parts) && isset($parts['port'])) {
            return $host.':'.$parts['port'];
        }

        return $host;
    }

    private function hostOnly(string $url): string
    {
        $parts = parse_url($url);
        if ($parts === false || ! isset($parts['host'])) {
            return '';
        }

        return (string) $parts['host'];
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
