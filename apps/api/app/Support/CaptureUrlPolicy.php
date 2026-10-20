<?php

namespace App\Support;

final class CaptureUrlPolicy
{
    /**
     * Hosts that resolve inside the Docker network or to a cloud metadata service.
     *
     * @var list<string>
     */
    private const BLOCKED_HOSTS = [
        'host.docker.internal',
        'vulnerable-target',
        'metadata.google.internal',
        'metadata.google.com',
        'mysql',
        'rabbitmq',
        'api',
        'api-consumers',
        'client',
        'caddy',
        'capture',
        'dast-worker',
        'sast-worker',
    ];

    public static function host(string $url): ?string
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return null;
        }

        return strtolower(trim($host, '[]'));
    }

    public static function isDisallowedHost(string $host): bool
    {
        $host = strtolower(trim($host, '[]'));
        if ($host === '' || in_array($host, self::BLOCKED_HOSTS, true)) {
            return true;
        }

        if (str_ends_with($host, '.metadata.google.internal')
            || str_ends_with($host, '.local')
            || str_ends_with($host, '.internal')) {
            return true;
        }

        return self::isLinkLocal($host);
    }

    public static function hostInScope(string $targetUrl, string $rawUrl): bool
    {
        $targetHost = self::host($targetUrl);
        $host = self::host($rawUrl);
        if ($targetHost === null || $host === null) {
            return false;
        }

        if (self::isDisallowedHost($targetHost) || self::isDisallowedHost($host)) {
            return false;
        }

        return $host === $targetHost || str_ends_with($host, '.'.$targetHost);
    }

    private static function isLinkLocal(string $host): bool
    {
        if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $long = ip2long($host);

            return $long !== false && ($long & 0xFFFF0000) === ip2long('169.254.0.0');
        }

        if (! filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            return false;
        }

        $packed = inet_pton($host);
        if ($packed === false) {
            return false;
        }

        return (ord($packed[0]) === 0xFE) && ((ord($packed[1]) & 0xC0) === 0x80);
    }
}
