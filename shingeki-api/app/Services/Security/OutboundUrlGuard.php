<?php

namespace App\Services\Security;

use InvalidArgumentException;

class OutboundUrlGuard
{
    /**
     * @var list<string>
     */
    private const METADATA_HOSTS = [
        'metadata.google.internal',
        'metadata.google.com',
        '169.254.169.254',
        '100.100.100.200',
    ];

    public function assertSafe(string $url): void
    {
        $parts = parse_url($url);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            throw new InvalidArgumentException('URL is invalid.');
        }

        $scheme = strtolower((string) $parts['scheme']);
        $allowedSchemes = config('security.ssrf.allowed_schemes', ['http', 'https']);

        if (! in_array($scheme, $allowedSchemes, true)) {
            throw new InvalidArgumentException('URL scheme is not allowed.');
        }

        $host = strtolower(trim((string) $parts['host'], '[]'));
        $allowPrivate = (bool) config('security.ssrf.allow_private_networks', false);
        $port = (int) ($parts['port'] ?? ($scheme === 'https' ? 443 : 80));
        $allowedPorts = config('security.ssrf.allowed_ports', [80, 443]);

        if ($this->isMetadataHost($host)) {
            throw new InvalidArgumentException('URL host is not allowed.');
        }

        if (! $allowPrivate && ! in_array($port, $allowedPorts, true)) {
            throw new InvalidArgumentException('URL port is not allowed.');
        }

        if ($this->isIpAddress($host)) {
            $this->assertIpAllowed($host, $allowPrivate);

            return;
        }

        if (! (bool) config('security.ssrf.resolve_dns', true)) {
            return;
        }

        foreach ($this->resolveHost($host) as $ip) {
            $this->assertIpAllowed($ip, $allowPrivate);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function httpOptions(): array
    {
        $maxRedirects = (int) config('security.ssrf.max_redirects', 3);

        return [
            'allow_redirects' => [
                'max' => $maxRedirects,
                'strict' => true,
                'referer' => false,
                'on_redirect' => function ($request, $response, $uri): void {
                    $this->assertSafe((string) $uri);
                },
            ],
        ];
    }

    private function isMetadataHost(string $host): bool
    {
        return in_array($host, self::METADATA_HOSTS, true);
    }

    private function isIpAddress(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_IP) !== false;
    }

    private function assertIpAllowed(string $ip, bool $allowPrivate): void
    {
        if ($this->isMetadataIp($ip)) {
            throw new InvalidArgumentException('URL host is not allowed.');
        }

        if ($allowPrivate) {
            return;
        }

        $flags = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;

        if (filter_var($ip, FILTER_VALIDATE_IP, $flags) === false) {
            throw new InvalidArgumentException('URL host is not allowed.');
        }
    }

    private function isMetadataIp(string $ip): bool
    {
        if ($ip === '169.254.169.254' || $ip === '100.100.100.200') {
            return true;
        }

        return str_starts_with($ip, '169.254.');
    }

    /**
     * @return list<string>
     */
    private function resolveHost(string $host): array
    {
        $records = @dns_get_record($host, DNS_A + DNS_AAAA);
        $ips = [];

        if (is_array($records)) {
            foreach ($records as $record) {
                if (isset($record['ip']) && is_string($record['ip'])) {
                    $ips[] = $record['ip'];
                }

                if (isset($record['ipv6']) && is_string($record['ipv6'])) {
                    $ips[] = $record['ipv6'];
                }
            }
        }

        if ($ips === []) {
            $fallback = gethostbyname($host);

            if ($fallback !== $host && $this->isIpAddress($fallback)) {
                $ips[] = $fallback;
            }
        }

        if ($ips === []) {
            throw new InvalidArgumentException('URL host could not be resolved.');
        }

        return array_values(array_unique($ips));
    }
}
