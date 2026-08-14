<?php

namespace App\Services\TargetAccess\ManualProxy;

use App\Enums\Catalog\AttackTargetLocation;
use App\Models\Identity\User;
use App\Models\Workspace\System;
use App\Services\Security\OutboundUrlGuard;
use App\Services\TargetAccess\TargetSession\TargetSessionService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;

class ManualProxyService
{
    private const RESPONSE_BODY_LIMIT = 65536;

    public function __construct(
        private readonly ManualProxyUrlGuard $urlGuard,
        private readonly ManualProxyPayloadInjector $payloadInjector,
        private readonly TargetSessionService $targetSessionService,
        private readonly OutboundUrlGuard $outboundUrlGuard,
    ) {}

    /**
     * @param  array<string, string>  $query
     * @param  array<string, string>  $headers
     * @param  array{target_location?: string, field?: string, value?: string}|null  $payload
     * @return array<string, mixed>
     */
    public function send(
        User $user,
        System $system,
        string $method,
        string $path,
        array $query,
        array $headers,
        ?string $body,
        ?string $contentType,
        bool $useTargetSession,
        ?array $payload,
    ): array {
        $method = strtoupper($method);
        $url = $this->urlGuard->resolve($system, $path);
        $url = $this->payloadInjector->mergeQuery($url, $query);

        if ($payload !== null && ($payload['target_location'] ?? null) !== null) {
            $injected = $this->payloadInjector->apply(
                $url,
                $method,
                [],
                $headers,
                $body,
                $contentType,
                AttackTargetLocation::from((string) $payload['target_location']),
                (string) ($payload['field'] ?? ''),
                (string) ($payload['value'] ?? ''),
            );
            $url = $injected['url'];
            $headers = $injected['headers'];
            $body = $injected['body'];
        }

        if ($useTargetSession) {
            $headers = $this->mergeTargetSessionHeaders($user, $system, $headers);
        }

        $started = hrtime(true);

        try {
            $response = Http::timeout(30)
                ->withOptions($this->outboundUrlGuard->httpOptions())
                ->withHeaders($headers)
                ->send($method, $url, $this->requestOptions($body));
        } catch (ConnectionException $exception) {
            throw new InvalidArgumentException(
                'Unable to reach the system target.',
            );
        }

        $durationMs = (int) round((hrtime(true) - $started) / 1_000_000);

        $responseBody = $response->body();
        $truncated = strlen($responseBody) > self::RESPONSE_BODY_LIMIT;

        return [
            'url' => $url,
            'method' => $method,
            'request_dump' => $this->formatRequestDump($method, $url, $headers, $body),
            'status_code' => $response->status(),
            'response_headers' => $response->headers(),
            'response_body' => $truncated
                ? substr($responseBody, 0, self::RESPONSE_BODY_LIMIT)
                : $responseBody,
            'response_body_truncated' => $truncated,
            'duration_ms' => $durationMs,
        ];
    }

    /**
     * @param  array<string, string>  $headers
     * @return array<string, string>
     */
    private function mergeTargetSessionHeaders(User $user, System $system, array $headers): array
    {
        $auth = $this->targetSessionService->resolveQueueAuth($user, $system);
        if ($auth === null) {
            return $headers;
        }

        foreach ($auth['headers'] as $name => $value) {
            if (strtolower($name) === 'cookie' && isset($headers['Cookie'])) {
                $headers['Cookie'] = $headers['Cookie'].'; '.$value;

                continue;
            }

            $headers[$name] = $value;
        }

        return $headers;
    }

    /**
     * @return array<string, mixed>
     */
    private function requestOptions(?string $body): array
    {
        if ($body === null || $body === '') {
            return [];
        }

        return ['body' => $body];
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function formatRequestDump(string $method, string $url, array $headers, ?string $body): string
    {
        $lines = ["{$method} {$url} HTTP/1.1"];
        foreach ($headers as $name => $value) {
            $lines[] = "{$name}: {$value}";
        }
        $lines[] = '';
        if ($body !== null && $body !== '') {
            $lines[] = $body;
        }

        return implode("\r\n", $lines);
    }
}
