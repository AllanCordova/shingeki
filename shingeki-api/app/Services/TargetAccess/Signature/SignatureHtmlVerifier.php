<?php

namespace App\Services\TargetAccess\Signature;

use App\Services\Security\OutboundUrlGuard;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;

class SignatureHtmlVerifier
{
    public const META_NAME = 'shingeki-signature';

    public function __construct(
        private readonly OutboundUrlGuard $outboundUrlGuard,
    ) {}

    public function fetchHtml(string $url): string
    {
        try {
            $this->outboundUrlGuard->assertSafe($url);
        } catch (InvalidArgumentException $exception) {
            throw new RuntimeException('Unable to fetch system index.', previous: $exception);
        }

        $response = Http::timeout(15)
            ->withOptions($this->outboundUrlGuard->httpOptions())
            ->withHeaders(['User-Agent' => 'Shingeki-Signature-Verifier/1.0'])
            ->get($url);

        if (! $response->successful()) {
            throw new RuntimeException('Unable to fetch system index.');
        }

        return $response->body();
    }

    public function containsToken(string $html, string $token): bool
    {
        if ($token === '') {
            return false;
        }

        $escapedName = preg_quote(self::META_NAME, '/');
        $escapedToken = preg_quote($token, '/');

        $patterns = [
            '/<meta\s+[^>]*name=["\']'.$escapedName.'["\'][^>]*content=["\']'.$escapedToken.'["\'][^>]*>/i',
            '/<meta\s+[^>]*content=["\']'.$escapedToken.'["\'][^>]*name=["\']'.$escapedName.'["\'][^>]*>/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $html) === 1) {
                return true;
            }
        }

        return false;
    }
}
