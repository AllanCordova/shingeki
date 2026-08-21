<?php

namespace App\Support;

final class DiscoveryStartPath
{
    public static function normalize(?string $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $path = trim($value);
        $path = str_replace('\\', '/', $path);

        if (preg_match('#^https?://#i', $path) === 1) {
            $parts = parse_url($path);
            $path = ($parts['path'] ?? '/')
                .(isset($parts['query']) ? '?'.$parts['query'] : '');
        }

        if (($hashPos = strpos($path, '#')) !== false) {
            $path = substr($path, 0, $hashPos);
        }

        $path = preg_replace('#/+#', '/', $path) ?? '/';

        if ($path === '' || $path === false) {
            $path = '/';
        }

        if (! str_starts_with($path, '/')) {
            $path = '/'.$path;
        }

        return $path;
    }
}
