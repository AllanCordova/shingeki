<?php

namespace App\Support;

use InvalidArgumentException;
use JsonException;

final class DastRouteMap
{
    public const MAX_ROUTES = 400;

    /**
     * @var list<string>
     */
    private const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

    /**
     * @param  list<mixed>  $routes
     * @return list<array<string, mixed>>
     */
    public static function normalize(array $routes): array
    {
        if ($routes === []) {
            throw new InvalidArgumentException('Route map must include at least one route.');
        }

        if (count($routes) > self::MAX_ROUTES) {
            throw new InvalidArgumentException('Route map cannot exceed '.self::MAX_ROUTES.' routes.');
        }

        $normalized = [];
        foreach (array_values($routes) as $index => $route) {
            if (! is_array($route)) {
                throw new InvalidArgumentException('Route map entry '.($index + 1).' must be an object.');
            }
            $normalized[] = self::normalizeRoute($route, $index);
        }

        return $normalized;
    }

    /**
     * @param  array<mixed>  $route
     * @return array<string, mixed>
     */
    private static function normalizeRoute(array $route, int $index): array
    {
        $label = 'Route map entry '.($index + 1);
        $method = strtoupper(trim((string) ($route['method'] ?? 'GET')));
        if (! in_array($method, self::METHODS, true)) {
            throw new InvalidArgumentException($label.' has an invalid method.');
        }

        $path = trim((string) ($route['path'] ?? ''));
        $path = str_replace('\\', '/', $path);
        if ($path === '') {
            throw new InvalidArgumentException($label.' is missing a path.');
        }
        if (preg_match('#^[a-z][a-z0-9+.-]*://#i', $path) === 1 || str_starts_with($path, '//')) {
            throw new InvalidArgumentException($label.' must be a path on the target, not a full URL.');
        }

        $query = self::normalizeQuery($route['query'] ?? null, $label);
        $embedded = self::splitEmbeddedQuery($path);
        $path = $embedded['path'];
        foreach ($embedded['query'] as $key => $value) {
            if (! array_key_exists($key, $query)) {
                $query[$key] = $value;
            }
        }

        $path = self::substitutePlaceholders($path, $query, $label);
        if (preg_match('/[{}]/', $path) === 1) {
            throw new InvalidArgumentException($label.' still has an unsubstituted placeholder.');
        }

        $path = self::cleanPath($path, $label);
        $body = self::normalizeBody($route['body'] ?? null, $label);

        $normalized = [
            'method' => $method,
            'path' => $path,
        ];
        if ($query !== []) {
            $normalized['query'] = $query;
        }
        if ($body !== null) {
            $normalized['body'] = $body;
        }

        $content = strtolower(trim((string) ($route['content'] ?? '')));
        if ($content !== '') {
            if (! in_array($content, ['form', 'xml'], true)) {
                throw new InvalidArgumentException($label.' has an invalid content type.');
            }
            $normalized['content'] = $content;
        }

        $xmlRoot = trim((string) ($route['xml_root'] ?? ''));
        if ($xmlRoot !== '') {
            if (preg_match('/^[A-Za-z_][\w:-]{0,40}$/', $xmlRoot) !== 1) {
                throw new InvalidArgumentException($label.' has an invalid xml root.');
            }
            $normalized['xml_root'] = $xmlRoot;
        }

        return $normalized;
    }

    /**
     * @return array{path: string, query: array<string, string>}
     */
    private static function splitEmbeddedQuery(string $path): array
    {
        $query = [];
        $hash = strpos($path, '#');
        if ($hash !== false) {
            $path = substr($path, 0, $hash);
        }

        $separator = strpos($path, '?');
        if ($separator === false) {
            return ['path' => $path, 'query' => $query];
        }

        $rawQuery = substr($path, $separator + 1);
        $path = substr($path, 0, $separator);
        parse_str($rawQuery, $parsed);
        foreach ($parsed as $key => $value) {
            if (! is_string($key) || ! is_scalar($value)) {
                continue;
            }
            $query[$key] = (string) $value;
        }

        return ['path' => $path, 'query' => $query];
    }

    /**
     * @param  array<string, string>  $query
     */
    private static function substitutePlaceholders(string $path, array &$query, string $label): string
    {
        $replaced = preg_replace_callback(
            '/\{([A-Za-z0-9_.-]+)\}/',
            function (array $match) use (&$query, $label): string {
                $key = $match[1];
                if (! array_key_exists($key, $query) || $query[$key] === '') {
                    throw new InvalidArgumentException($label.' is missing a value for {'.$key.'}. Put it in query.');
                }
                $value = $query[$key];
                if (self::invalidPlaceholderValue($value)) {
                    throw new InvalidArgumentException($label.' placeholder {'.$key.'} has an invalid value.');
                }
                unset($query[$key]);

                return rawurlencode($value);
            },
            $path,
        );

        return is_string($replaced) ? $replaced : $path;
    }

    private static function invalidPlaceholderValue(string $value): bool
    {
        return str_contains($value, '..')
            || str_contains($value, '/')
            || str_contains($value, '\\')
            || preg_match('/[[:cntrl:]]/', $value) === 1;
    }

    private static function cleanPath(string $path, string $label): string
    {
        $path = preg_replace('#/+#', '/', $path) ?? $path;
        if ($path === '' || $path === false) {
            $path = '/';
        }
        if (! str_starts_with($path, '/')) {
            $path = '/'.$path;
        }

        foreach (explode('/', trim($path, '/')) as $segment) {
            if ($segment === '.' || $segment === '..') {
                throw new InvalidArgumentException($label.' must not contain . or .. segments.');
            }
        }

        if (strlen($path) > 2048) {
            throw new InvalidArgumentException($label.' path is too long.');
        }

        return $path;
    }

    /**
     * @return array<string, string>
     */
    private static function normalizeQuery(mixed $query, string $label): array
    {
        if ($query === null || $query === []) {
            return [];
        }
        if (! is_array($query) || array_is_list($query)) {
            throw new InvalidArgumentException($label.' query must be an object.');
        }

        $normalized = [];
        foreach ($query as $key => $value) {
            $name = trim((string) $key);
            if ($name === '' || strlen($name) > 256) {
                throw new InvalidArgumentException($label.' has an invalid query name.');
            }
            if (is_bool($value)) {
                $normalized[$name] = $value ? 'true' : 'false';

                continue;
            }
            if (is_int($value) || is_float($value)) {
                $normalized[$name] = (string) $value;

                continue;
            }
            if (! is_string($value)) {
                throw new InvalidArgumentException($label.' query values must be strings or numbers.');
            }
            if (strlen($value) > 4096) {
                throw new InvalidArgumentException($label.' query value is too long.');
            }
            $normalized[$name] = $value;
        }

        return $normalized;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function normalizeBody(mixed $body, string $label): ?array
    {
        if ($body === null || $body === []) {
            return null;
        }
        if (! is_array($body) || array_is_list($body)) {
            throw new InvalidArgumentException($label.' body must be a JSON object.');
        }

        try {
            $encoded = json_encode($body, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new InvalidArgumentException($label.' body must be a JSON object.');
        }

        if (strlen($encoded) > 65536) {
            throw new InvalidArgumentException($label.' body is too long.');
        }

        return $body;
    }
}
