<?php

namespace App\Support;

use RuntimeException;

class BrowserStateCipher
{
    /**
     * @return array{v: int, alg: string, nonce: string, ct: string}
     */
    public function encrypt(string $plaintext): array
    {
        $nonce = random_bytes(12);
        $tag = '';
        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            $this->key(),
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            '',
            16,
        );

        if (! is_string($ciphertext) || strlen($tag) !== 16) {
            throw new RuntimeException('Browser state encryption failed.');
        }

        return [
            'v' => 1,
            'alg' => 'AES-256-GCM',
            'nonce' => base64_encode($nonce),
            'ct' => base64_encode($ciphertext.$tag),
        ];
    }

    public function containsPlaintext(string $encoded, string $secret): bool
    {
        return $secret !== '' && str_contains($encoded, $secret);
    }

    private function key(): string
    {
        $configured = config('browser_state.key');
        if (! is_string($configured) || $configured === '') {
            throw new RuntimeException('BROWSER_STATE_KEY is required.');
        }

        $key = base64_decode($configured, true);
        if (! is_string($key) || strlen($key) !== 32) {
            throw new RuntimeException('BROWSER_STATE_KEY must be 32 bytes encoded as base64.');
        }

        return $key;
    }
}
