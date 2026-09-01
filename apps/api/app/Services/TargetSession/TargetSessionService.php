<?php

namespace App\Services\TargetSession;

use App\Enums\TargetSession\TargetAuthType;
use App\Models\System\System;
use App\Models\TargetSession\SystemTargetSession;
use App\Models\User\User;
use Laravel\Sanctum\PersonalAccessToken;
use RuntimeException;

class TargetSessionService
{
    private const STORAGE_MAX_KEYS = 50;

    private const STORAGE_MAX_VALUE_BYTES = 8192;

    private const COOKIE_MAX = 80;

    private const ROUTE_MAX = 200;

    private const ORIGIN_MAX = 10;

    /**
     * @return array{
     *     type: string,
     *     headers: array<string, string>,
     *     storage?: array{local: array<string, string>, session: array<string, string>, origins?: list<array{origin: string, local: array<string, string>, session: array<string, string>}>},
     *     cookies?: list<array<string, mixed>>,
     *     user_agent?: string,
     *     routes?: list<array{method: string, url: string, type?: string}>
     * }|null
     */
    public function resolveQueueAuth(User $user, System $system): ?array
    {
        $session = $this->findActiveSession($user, $system);

        if ($session === null) {
            return null;
        }

        $payload = [
            'type' => $session->auth_type->value,
            'headers' => $session->headers,
        ];

        $storage = $this->normalizedStorage($session->storage);
        if ($storage === null) {
            return $payload;
        }

        $browserStorage = $this->browserStorageOnly($storage);
        if ($browserStorage !== null) {
            $payload['storage'] = $browserStorage;
        }
        if (isset($storage['cookies']) && is_array($storage['cookies']) && $storage['cookies'] !== []) {
            $payload['cookies'] = $storage['cookies'];
        }
        if (isset($storage['user_agent']) && is_string($storage['user_agent']) && $storage['user_agent'] !== '') {
            $payload['user_agent'] = $storage['user_agent'];
        }
        if (isset($storage['routes']) && is_array($storage['routes']) && $storage['routes'] !== []) {
            $payload['routes'] = $storage['routes'];
        }

        return $payload;
    }

    public function findActiveSession(User $user, System $system): ?SystemTargetSession
    {
        $session = SystemTargetSession::query()
            ->where('user_id', $user->id)
            ->where('system_id', $system->id)
            ->first();

        if ($session === null || $session->isExpired()) {
            return null;
        }

        return $session;
    }

    /**
     * @param  array<string, mixed>|null  $storage
     */
    public function store(
        User $user,
        System $system,
        TargetAuthType $authType,
        string $credential,
        ?\DateTimeInterface $expiresAt = null,
        ?array $storage = null,
        ?array $extraHeaders = null,
    ): SystemTargetSession {
        $this->assertNotPlatformApiToken($authType, $credential);
        if (isset($extraHeaders['Authorization']) && is_string($extraHeaders['Authorization'])) {
            $this->assertNotPlatformApiToken(TargetAuthType::Bearer, $extraHeaders['Authorization']);
        }

        $headers = $this->buildHeaders($authType, $credential);
        foreach ($extraHeaders ?? [] as $key => $value) {
            if (! is_string($key) || ! is_string($value)) {
                continue;
            }
            $key = trim($key);
            $value = trim($value);
            if ($key === '' || $value === '') {
                continue;
            }
            $headers[$key] = $value;
        }

        return SystemTargetSession::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'system_id' => $system->id,
            ],
            [
                'auth_type' => $authType,
                'headers' => $headers,
                'storage' => $this->normalizedStorage($storage),
                'expires_at' => $expiresAt,
            ],
        );
    }

    public function revoke(User $user, System $system): bool
    {
        return SystemTargetSession::query()
            ->where('user_id', $user->id)
            ->where('system_id', $system->id)
            ->delete() > 0;
    }

    /**
     * @return array<string, string>
     */
    public function buildHeaders(TargetAuthType $authType, string $credential): array
    {
        $credential = trim($credential);

        return match ($authType) {
            TargetAuthType::Cookie => ['Cookie' => $credential],
            TargetAuthType::Bearer => ['Authorization' => $this->normalizeBearer($credential)],
        };
    }

    /**
     * @param  array<string, mixed>|null  $local
     * @param  array<string, mixed>|null  $session
     * @param  list<array<string, mixed>>|null  $cookies
     * @param  list<array<string, mixed>>|null  $routes
     * @param  list<array<string, mixed>>|null  $origins
     * @return array<string, mixed>|null
     */
    public function assembleStorage(
        ?array $local,
        ?array $session,
        ?array $cookies = null,
        ?array $routes = null,
        ?array $origins = null,
        ?string $userAgent = null,
    ): ?array {
        return $this->normalizedStorage([
            'local' => $this->sanitizeStorageMap($local),
            'session' => $this->sanitizeStorageMap($session),
            'cookies' => $cookies,
            'routes' => $routes,
            'origins' => $origins,
            'user_agent' => $userAgent,
        ]);
    }

    /**
     * @param  array<string, mixed>|null  $local
     * @param  array<string, mixed>|null  $session
     * @return array{local: array<string, string>, session: array<string, string>}|null
     */
    public function sanitizeStorage(?array $local, ?array $session): ?array
    {
        return $this->normalizedStorage([
            'local' => $this->sanitizeStorageMap($local),
            'session' => $this->sanitizeStorageMap($session),
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $cookies
     */
    public function cookieHeaderFromCookies(array $cookies): string
    {
        $pairs = [];
        foreach ($this->sanitizeCookies($cookies) as $cookie) {
            $pairs[] = $cookie['name'].'='.$cookie['value'];
        }

        return implode('; ', $pairs);
    }

    /**
     * @param  array<string, mixed>|null  $storage
     * @return array<string, mixed>|null
     */
    private function normalizedStorage(?array $storage): ?array
    {
        if ($storage === null) {
            return null;
        }

        $local = $this->sanitizeStorageMap($storage['local'] ?? null);
        $session = $this->sanitizeStorageMap($storage['session'] ?? null);
        $cookies = $this->sanitizeCookies($storage['cookies'] ?? null);
        $routes = $this->sanitizeRoutes($storage['routes'] ?? null);
        $origins = $this->sanitizeOrigins($storage['origins'] ?? null);
        $userAgent = $this->sanitizeUserAgent($storage['user_agent'] ?? null);

        if ($local === [] && $session === [] && $cookies === [] && $routes === [] && $origins === [] && $userAgent === null) {
            return null;
        }

        $out = [];
        if ($local !== [] || $session !== []) {
            $out['local'] = $local;
            $out['session'] = $session;
        }
        if ($origins !== []) {
            $out['origins'] = $origins;
        }
        if ($cookies !== []) {
            $out['cookies'] = $cookies;
        }
        if ($routes !== []) {
            $out['routes'] = $routes;
        }
        if ($userAgent !== null) {
            $out['user_agent'] = $userAgent;
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $storage
     * @return array{local: array<string, string>, session: array<string, string>, origins?: list<array{origin: string, local: array<string, string>, session: array<string, string>}>}|null
     */
    private function browserStorageOnly(array $storage): ?array
    {
        $local = is_array($storage['local'] ?? null) ? $storage['local'] : [];
        $session = is_array($storage['session'] ?? null) ? $storage['session'] : [];
        $origins = is_array($storage['origins'] ?? null) ? $storage['origins'] : [];

        if ($local === [] && $session === [] && $origins === []) {
            return null;
        }

        $out = [
            'local' => $local,
            'session' => $session,
        ];
        if ($origins !== []) {
            $out['origins'] = $origins;
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>|null  $values
     * @return array<string, string>
     */
    private function sanitizeStorageMap(?array $values): array
    {
        if ($values === null) {
            return [];
        }

        $out = [];
        foreach ($values as $key => $value) {
            if (! is_string($key) || ! is_string($value)) {
                continue;
            }

            $key = trim($key);
            $value = trim($value);
            if ($key === '' || $value === '') {
                continue;
            }
            if (strlen($value) > self::STORAGE_MAX_VALUE_BYTES) {
                continue;
            }

            $out[$key] = $value;
            if (count($out) >= self::STORAGE_MAX_KEYS) {
                break;
            }
        }

        return $out;
    }

    /**
     * @param  mixed  $cookies
     * @return list<array<string, mixed>>
     */
    private function sanitizeCookies(mixed $cookies): array
    {
        if (! is_array($cookies)) {
            return [];
        }

        $out = [];
        foreach ($cookies as $cookie) {
            if (! is_array($cookie)) {
                continue;
            }
            $name = trim((string) ($cookie['name'] ?? ''));
            $value = (string) ($cookie['value'] ?? '');
            if ($name === '' || $value === '' || strlen($value) > 4096) {
                continue;
            }

            $row = [
                'name' => $name,
                'value' => $value,
            ];
            if (isset($cookie['domain']) && is_string($cookie['domain']) && trim($cookie['domain']) !== '') {
                $row['domain'] = strtolower(trim($cookie['domain']));
            }
            if (isset($cookie['path']) && is_string($cookie['path']) && trim($cookie['path']) !== '') {
                $row['path'] = trim($cookie['path']);
            }
            foreach (['secure', 'httpOnly', 'hostOnly', 'session'] as $flag) {
                if (array_key_exists($flag, $cookie)) {
                    $row[$flag] = (bool) $cookie[$flag];
                }
            }
            if (isset($cookie['sameSite']) && is_string($cookie['sameSite']) && trim($cookie['sameSite']) !== '') {
                $row['sameSite'] = strtolower(trim($cookie['sameSite']));
            }
            if (isset($cookie['expirationDate']) && is_numeric($cookie['expirationDate'])) {
                $row['expirationDate'] = (float) $cookie['expirationDate'];
            }
            if (isset($cookie['partitionKey']) && is_array($cookie['partitionKey'])) {
                $topLevel = trim((string) ($cookie['partitionKey']['topLevelSite'] ?? ''));
                if ($topLevel !== '') {
                    $row['partitionKey'] = [
                        'topLevelSite' => $topLevel,
                        'hasCrossSiteAncestor' => (bool) ($cookie['partitionKey']['hasCrossSiteAncestor'] ?? false),
                    ];
                }
            }

            $out[] = $row;
            if (count($out) >= self::COOKIE_MAX) {
                break;
            }
        }

        return $out;
    }

    /**
     * @param  mixed  $routes
     * @return list<array{method: string, url: string, type?: string}>
     */
    private function sanitizeRoutes(mixed $routes): array
    {
        if (! is_array($routes)) {
            return [];
        }

        $out = [];
        $seen = [];
        foreach ($routes as $route) {
            if (! is_array($route)) {
                continue;
            }
            $method = strtoupper(trim((string) ($route['method'] ?? 'GET')));
            $url = trim((string) ($route['url'] ?? ''));
            if ($method === '' || $url === '' || ! str_starts_with($url, 'http')) {
                continue;
            }
            if (strlen($url) > 2048) {
                continue;
            }
            $key = $method.' '.$url;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $row = [
                'method' => $method,
                'url' => $url,
            ];
            $type = trim((string) ($route['type'] ?? ''));
            if ($type !== '') {
                $row['type'] = $type;
            }
            $out[] = $row;
            if (count($out) >= self::ROUTE_MAX) {
                break;
            }
        }

        return $out;
    }

    /**
     * @param  mixed  $origins
     * @return list<array{origin: string, local: array<string, string>, session: array<string, string>}>
     */
    private function sanitizeOrigins(mixed $origins): array
    {
        if (! is_array($origins)) {
            return [];
        }

        $out = [];
        foreach ($origins as $originRow) {
            if (! is_array($originRow)) {
                continue;
            }
            $origin = rtrim(trim((string) ($originRow['origin'] ?? '')), '/');
            if ($origin === '' || ! str_starts_with($origin, 'http')) {
                continue;
            }
            $local = $this->sanitizeStorageMap($originRow['local'] ?? null);
            $session = $this->sanitizeStorageMap($originRow['session'] ?? null);
            if ($local === [] && $session === []) {
                continue;
            }
            $out[] = [
                'origin' => $origin,
                'local' => $local,
                'session' => $session,
            ];
            if (count($out) >= self::ORIGIN_MAX) {
                break;
            }
        }

        return $out;
    }

    private function sanitizeUserAgent(mixed $userAgent): ?string
    {
        if (! is_string($userAgent)) {
            return null;
        }
        $userAgent = trim($userAgent);
        if ($userAgent === '' || strlen($userAgent) > 512) {
            return null;
        }

        return $userAgent;
    }

    private function normalizeBearer(string $value): string
    {
        if (str_starts_with(strtolower($value), 'bearer ')) {
            return $value;
        }

        return 'Bearer '.$value;
    }

    private function assertNotPlatformApiToken(TargetAuthType $authType, string $credential): void
    {
        if ($authType !== TargetAuthType::Bearer) {
            return;
        }

        $token = trim($credential);
        if (str_starts_with(strtolower($token), 'bearer ')) {
            $token = trim(substr($token, 7));
        }

        if ($token === '') {
            return;
        }

        if (PersonalAccessToken::findToken($token) !== null) {
            throw new RuntimeException(
                'Platform API tokens cannot be used as target session credentials.',
            );
        }
    }
}
