<?php

namespace App\Services\Auth;

use App\Enums\User\UserRole;
use App\Models\User\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Socialite\Two\User as SocialiteUser;
use RuntimeException;

class GoogleAuthService
{
    private const HANDOFF_PREFIX = 'google_auth_handoff:';

    private const HANDOFF_TTL_SECONDS = 60;

    /**
     * Upsert a local user from a verified Google OIDC identity.
     *
     * @throws RuntimeException
     */
    public function upsertFromGoogleUser(SocialiteUser $googleUser): User
    {
        $googleId = $googleUser->getId();
        $email = $googleUser->getEmail();
        $name = $googleUser->getName() ?: ($email ? Str::before($email, '@') : null);

        if (! is_string($googleId) || $googleId === '') {
            throw new RuntimeException('Google ID token is missing subject (sub).');
        }

        if (! is_string($email) || $email === '') {
            throw new RuntimeException('Google ID token is missing email.');
        }

        $raw = $googleUser->user;
        $emailVerified = (bool) ($raw['email_verified'] ?? $raw['verified_email'] ?? false);

        if (! $emailVerified) {
            throw new RuntimeException('Google email is not verified.');
        }

        $user = User::query()->where('google_id', $googleId)->first();

        if ($user) {
            $user->fill([
                'name' => $name ?: $user->name,
                'email' => $email,
            ]);
            $user->save();

            return $user;
        }

        $user = User::query()->where('email', $email)->first();

        if ($user) {
            $user->google_id = $googleId;
            if ($name) {
                $user->name = $name;
            }
            $user->save();

            return $user;
        }

        return User::create([
            'name' => $name ?: 'Google User',
            'email' => $email,
            'google_id' => $googleId,
            'password' => null,
            'role' => UserRole::User,
        ]);
    }

    /**
     * Create a Sanctum token and a one-time handoff code bound to a browser nonce.
     *
     * @return array{code: string, user: User}
     */
    public function createHandoff(User $user, string $nonce): array
    {
        if ($nonce === '') {
            throw new RuntimeException('Missing Google login nonce.');
        }

        $token = $user->createToken('auth-token')->plainTextToken;
        $code = Str::random(64);

        Cache::put(self::HANDOFF_PREFIX.$code, [
            'token' => $token,
            'user_id' => $user->id,
            'nonce' => $nonce,
        ], self::HANDOFF_TTL_SECONDS);

        return ['code' => $code, 'user' => $user];
    }

    /**
     * Consume a one-time handoff code when the browser nonce matches.
     *
     * @return array{token: string, user: User}
     *
     * @throws RuntimeException
     */
    public function consumeHandoff(string $code, string $nonce): array
    {
        $key = self::HANDOFF_PREFIX.$code;
        $payload = Cache::pull($key);

        if (! is_array($payload) || ! isset($payload['token'], $payload['user_id'], $payload['nonce'])) {
            throw new RuntimeException('Invalid or expired Google login code.');
        }

        if (! hash_equals((string) $payload['nonce'], $nonce)) {
            throw new RuntimeException('Invalid Google login nonce.');
        }

        $user = User::query()->find($payload['user_id']);

        if (! $user) {
            throw new RuntimeException('User for Google login code no longer exists.');
        }

        return [
            'token' => (string) $payload['token'],
            'user' => $user,
        ];
    }
}
