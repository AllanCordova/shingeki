<?php

namespace App\Services\TargetAccess\ManualProxy;

use App\Enums\Catalog\AttackTargetLocation;
use InvalidArgumentException;

class ManualProxyPayloadInjector
{
    /**
     * @param  array<string, string>  $query
     */
    public function mergeQuery(string $url, array $query): string
    {
        if ($query === []) {
            return $url;
        }

        return $this->appendQuery($url, $query);
    }

    /**
     * @param  array<string, string>  $query
     * @param  array<string, string>  $headers
     * @return array{url: string, headers: array<string, string>, body: ?string}
     */
    public function apply(
        string $url,
        string $method,
        array $query,
        array $headers,
        ?string $body,
        ?string $contentType,
        AttackTargetLocation $targetLocation,
        string $field,
        string $value,
    ): array {
        return match ($targetLocation) {
            AttackTargetLocation::QueryParameter => $this->injectQuery($url, $query, $headers, $body, $field, $value),
            AttackTargetLocation::UrlPath => $this->injectPath($url, $query, $headers, $body, $value !== '' ? $value : $field),
            AttackTargetLocation::Header => $this->injectHeader($url, $query, $headers, $body, $field !== '' ? $field : 'X-Forwarded-For', $value),
            AttackTargetLocation::Cookie => $this->injectCookie($url, $query, $headers, $body, $field, $value),
            AttackTargetLocation::Form, AttackTargetLocation::FileUpload => $this->injectFormBody($url, $query, $headers, $body, $contentType, $field, $value, $method),
            AttackTargetLocation::JsonBody, AttackTargetLocation::ApiEndpoint => $this->injectJsonBody($url, $query, $headers, $body, $contentType, $field, $value, $method),
            AttackTargetLocation::SourceCode => throw new InvalidArgumentException('SOURCE_CODE is not supported for manual proxy requests.'),
        };
    }

    /**
     * @param  array<string, string>  $query
     * @param  array<string, string>  $headers
     * @return array{url: string, headers: array<string, string>, body: ?string}
     */
    private function injectQuery(
        string $url,
        array $query,
        array $headers,
        ?string $body,
        string $field,
        string $value,
    ): array {
        if ($field === '') {
            throw new InvalidArgumentException('Payload field is required for query injection.');
        }

        $query[$field] = $value;

        return [
            'url' => $this->appendQuery($url, $query),
            'headers' => $headers,
            'body' => $body,
        ];
    }

    /**
     * @param  array<string, string>  $query
     * @param  array<string, string>  $headers
     * @return array{url: string, headers: array<string, string>, body: ?string}
     */
    private function injectPath(
        string $url,
        array $query,
        array $headers,
        ?string $body,
        string $segment,
    ): array {
        if ($segment === '') {
            throw new InvalidArgumentException('Payload value is required for path injection.');
        }

        $parts = parse_url($url);
        if ($parts === false) {
            throw new InvalidArgumentException('URL is invalid.');
        }

        $path = rtrim((string) ($parts['path'] ?? ''), '/').'/'.ltrim($segment, '/');
        $parts['path'] = $path;
        unset($parts['query']);

        return [
            'url' => $this->appendQuery($this->buildUrl($parts), $query),
            'headers' => $headers,
            'body' => $body,
        ];
    }

    /**
     * @param  array<string, string>  $query
     * @param  array<string, string>  $headers
     * @return array{url: string, headers: array<string, string>, body: ?string}
     */
    private function injectHeader(
        string $url,
        array $query,
        array $headers,
        ?string $body,
        string $name,
        string $value,
    ): array {
        $headers[$name] = $value;

        return [
            'url' => $this->appendQuery($url, $query),
            'headers' => $headers,
            'body' => $body,
        ];
    }

    /**
     * @param  array<string, string>  $query
     * @param  array<string, string>  $headers
     * @return array{url: string, headers: array<string, string>, body: ?string}
     */
    private function injectCookie(
        string $url,
        array $query,
        array $headers,
        ?string $body,
        string $field,
        string $value,
    ): array {
        $name = $field !== '' ? $field : 'session';
        $existing = $headers['Cookie'] ?? '';
        $pairs = $this->parseCookieHeader($existing);
        $pairs[$name] = $value;
        $headers['Cookie'] = $this->formatCookieHeader($pairs);

        return [
            'url' => $this->appendQuery($url, $query),
            'headers' => $headers,
            'body' => $body,
        ];
    }

    /**
     * @param  array<string, string>  $query
     * @param  array<string, string>  $headers
     * @return array{url: string, headers: array<string, string>, body: ?string}
     */
    private function injectFormBody(
        string $url,
        array $query,
        array $headers,
        ?string $body,
        ?string $contentType,
        string $field,
        string $value,
        string $method,
    ): array {
        if ($field === '') {
            throw new InvalidArgumentException('Payload field is required for form injection.');
        }

        $values = $this->parseFormBody($body);
        $values[$field] = $value;
        $encoded = http_build_query($values);
        $headers['Content-Type'] = $contentType ?: 'application/x-www-form-urlencoded';

        return [
            'url' => $this->appendQuery($url, $query),
            'headers' => $headers,
            'body' => $encoded,
        ];
    }

    /**
     * @param  array<string, string>  $query
     * @param  array<string, string>  $headers
     * @return array{url: string, headers: array<string, string>, body: ?string}
     */
    private function injectJsonBody(
        string $url,
        array $query,
        array $headers,
        ?string $body,
        ?string $contentType,
        string $field,
        string $value,
        string $method,
    ): array {
        if ($field === '') {
            throw new InvalidArgumentException('Payload field is required for JSON injection.');
        }

        $decoded = json_decode($body ?: '{}', true);
        if (! is_array($decoded)) {
            $decoded = [];
        }

        data_set($decoded, $field, $value);
        $encoded = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            throw new InvalidArgumentException('Unable to encode JSON body.');
        }

        $headers['Content-Type'] = $contentType ?: 'application/json';

        return [
            'url' => $this->appendQuery($url, $query),
            'headers' => $headers,
            'body' => $encoded,
        ];
    }

    /**
     * @param  array<string, string>  $query
     */
    private function appendQuery(string $url, array $query): string
    {
        if ($query === []) {
            return $url;
        }

        $parts = parse_url($url);
        if ($parts === false) {
            throw new InvalidArgumentException('URL is invalid.');
        }

        $existing = [];
        if (isset($parts['query'])) {
            parse_str((string) $parts['query'], $existing);
        }

        $merged = array_merge($existing, $query);
        $parts['query'] = http_build_query($merged);
        unset($parts['fragment']);

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
        $query = isset($parts['query']) && $parts['query'] !== '' ? '?'.$parts['query'] : '';

        return $scheme.'://'.$host.$port.$path.$query;
    }

    /**
     * @return array<string, string>
     */
    private function parseFormBody(?string $body): array
    {
        if ($body === null || trim($body) === '') {
            return [];
        }

        $values = [];
        parse_str($body, $values);

        return array_map(fn ($value) => is_scalar($value) ? (string) $value : json_encode($value), $values);
    }

    /**
     * @return array<string, string>
     */
    private function parseCookieHeader(string $cookieHeader): array
    {
        $pairs = [];
        foreach (explode(';', $cookieHeader) as $chunk) {
            $chunk = trim($chunk);
            if ($chunk === '') {
                continue;
            }

            [$name, $value] = array_pad(explode('=', $chunk, 2), 2, '');
            $pairs[trim($name)] = trim($value);
        }

        return $pairs;
    }

    /**
     * @param  array<string, string>  $pairs
     */
    private function formatCookieHeader(array $pairs): string
    {
        $segments = [];
        foreach ($pairs as $name => $value) {
            $segments[] = $name.'='.$value;
        }

        return implode('; ', $segments);
    }
}
