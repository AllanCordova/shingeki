<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionStateNormalizer
{
    /**
     * @return array{state: array<string, mixed>, kind: string}|JsonResponse
     */
    public function fromImportRequest(Request $request, string $targetUrl): array|JsonResponse
    {
        if ($request->filled('storage_state') && is_array($request->input('storage_state'))) {
            /** @var array<string, mixed> $state */
            $state = $request->input('storage_state');
            if (! $this->stateHasSession($state['cookies'] ?? [], $state['origins'] ?? [])) {
                return response()->json([
                    'message' => 'A sessão capturada está vazia.',
                ], 422);
            }

            return ['state' => $state, 'kind' => 'storage_state'];
        }

        $cookiesInput = $request->input('cookies');
        $authorization = trim((string) $request->input('authorization', ''));
        $host = parse_url($targetUrl, PHP_URL_HOST);
        $scheme = parse_url($targetUrl, PHP_URL_SCHEME) ?: 'https';
        if (! is_string($host) || $host === '') {
            return response()->json([
                'message' => 'O sistema não tem um target_url válido para montar a sessão.',
            ], 422);
        }

        $cookies = [];
        if (is_string($cookiesInput) && trim($cookiesInput) !== '') {
            $cookies = $this->parseCookieHeader(trim($cookiesInput), $host);
        } elseif (is_array($cookiesInput)) {
            foreach ($cookiesInput as $cookie) {
                if (! is_array($cookie)) {
                    continue;
                }
                $name = trim((string) ($cookie['name'] ?? ''));
                $value = (string) ($cookie['value'] ?? '');
                if ($name === '' || $value === '') {
                    continue;
                }
                $cookies[] = [
                    'name' => $name,
                    'value' => $value,
                    'domain' => (string) ($cookie['domain'] ?? $host),
                    'path' => (string) ($cookie['path'] ?? '/'),
                    'expires' => $cookie['expires'] ?? -1,
                    'httpOnly' => (bool) ($cookie['httpOnly'] ?? false),
                    'secure' => (bool) ($cookie['secure'] ?? str_starts_with($scheme, 'https')),
                    'sameSite' => (string) ($cookie['sameSite'] ?? 'Lax'),
                ];
            }
        }

        $origins = [];
        $kind = 'cookies';
        if ($authorization !== '') {
            $token = $authorization;
            if (! str_starts_with(strtolower($token), 'bearer ')) {
                $token = 'Bearer '.$token;
            }
            $raw = preg_replace('/^bearer\s+/i', '', $token) ?? $token;
            $origins[] = [
                'origin' => $scheme.'://'.$host,
                'localStorage' => [
                    ['name' => 'access_token', 'value' => $raw],
                ],
                'sessionStorage' => [],
            ];
            $kind = $cookies !== [] ? 'cookies_and_bearer' : 'bearer';
        }

        if (! $this->stateHasSession($cookies, $origins)) {
            return response()->json([
                'message' => 'Informe cookies, um token de API ou um storage_state válido.',
            ], 422);
        }

        return [
            'state' => [
                'cookies' => $cookies,
                'origins' => $origins,
            ],
            'kind' => $kind,
        ];
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
    public function fromCompleteBody(string $raw): array|JsonResponse
    {
        if (strlen($raw) > 1_048_576) {
            return response()->json([
                'message' => 'O estado do navegador é grande demais.',
            ], 422);
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded) || array_is_list($decoded)) {
            return response()->json([
                'message' => 'O estado do navegador precisa ser um objeto JSON.',
            ], 422);
        }

        $cookies = $decoded['cookies'] ?? [];
        $origins = $decoded['origins'] ?? [];
        if (! is_array($cookies) || ! is_array($origins)) {
            return response()->json([
                'message' => 'O estado do navegador precisa seguir o storageState.',
            ], 422);
        }

        if (! $this->stateHasSession($cookies, $origins)) {
            return response()->json([
                'message' => 'A sessão capturada está vazia.',
            ], 422);
        }

        return $decoded;
    }

    /**
     * @return list<string>
     */
    public function visitedUrlsFromCompleteBody(string $raw): array
    {
        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return [];
        }

        $urls = $decoded['visited_urls'] ?? [];
        if (! is_array($urls)) {
            return [];
        }

        $out = [];
        foreach ($urls as $url) {
            if (is_string($url) && trim($url) !== '') {
                $out[] = trim($url);
            }
        }

        return $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseCookieHeader(string $header, string $host): array
    {
        $cookies = [];
        foreach (explode(';', $header) as $part) {
            $part = trim($part);
            if ($part === '' || ! str_contains($part, '=')) {
                continue;
            }
            [$name, $value] = explode('=', $part, 2);
            $name = trim($name);
            $value = trim($value);
            if ($name === '' || $value === '') {
                continue;
            }
            $cookies[] = [
                'name' => $name,
                'value' => $value,
                'domain' => $host,
                'path' => '/',
                'expires' => -1,
                'httpOnly' => false,
                'secure' => true,
                'sameSite' => 'Lax',
            ];
        }

        return $cookies;
    }

    /**
     * @param  array<mixed>  $cookies
     * @param  array<mixed>  $origins
     */
    private function stateHasSession(array $cookies, array $origins): bool
    {
        if ($cookies !== []) {
            return true;
        }

        foreach ($origins as $origin) {
            if (! is_array($origin)) {
                continue;
            }
            foreach (['localStorage', 'sessionStorage'] as $key) {
                if (isset($origin[$key]) && is_array($origin[$key]) && $origin[$key] !== []) {
                    return true;
                }
            }
        }

        return false;
    }
}
