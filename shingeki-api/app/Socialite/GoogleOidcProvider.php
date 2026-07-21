<?php

namespace App\Socialite;

use Exception;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Arr;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User;

/**
 * Google OIDC provider that authenticates via the ID Token (JWT),
 * never via Access Token + /userinfo (token substitution safe).
 */
class GoogleOidcProvider extends GoogleProvider
{
    /**
     * Clock skew tolerance (seconds) for iat/nbf/exp checks.
     * Windows/local clocks are often 1–2s behind Google's iat.
     */
    private const JWT_LEEWAY_SECONDS = 120;

    /**
     * Resolve the authenticated Google user from the OAuth callback
     * by verifying the ID Token (signature, iss, aud, exp).
     *
     * @throws InvalidStateException
     * @throws Exception
     */
    public function userFromOidcCallback(): User
    {
        if ($this->hasInvalidState()) {
            throw new InvalidStateException;
        }

        $response = $this->getAccessTokenResponse($this->getCode());

        $idToken = Arr::get($response, 'id_token');

        if (! is_string($idToken) || $idToken === '') {
            throw new Exception('Google OIDC response did not include an ID token.');
        }

        // getUserByToken detects JWT and verifies sig / iss / aud / exp.
        $user = $this->mapUserToObject($this->getUserByToken($idToken));

        return $user->setToken(Arr::get($response, 'access_token'))
            ->setRefreshToken(Arr::get($response, 'refresh_token'))
            ->setExpiresIn(Arr::get($response, 'expires_in'))
            ->setApprovedScopes(explode($this->scopeSeparator, Arr::get($response, 'scope', '')));
    }

    /**
     * {@inheritdoc}
     *
     * Adds JWT leeway and accepts both Google issuer values from the OIDC spec.
     */
    protected function getUserFromJwtToken($idToken)
    {
        try {
            JWT::$leeway = self::JWT_LEEWAY_SECONDS;

            $user = (array) JWT::decode(
                $idToken,
                JWK::parseKeySet($this->getGoogleJwks())
            );

            $issuer = $user['iss'] ?? null;
            $validIssuers = [
                'https://accounts.google.com',
                'accounts.google.com',
            ];

            if (! is_string($issuer) || ! in_array($issuer, $validIssuers, true)) {
                throw new Exception('Invalid ID token issuer.');
            }

            if (! isset($user['aud']) || $user['aud'] !== $this->clientId) {
                throw new Exception('Invalid ID token audience.');
            }

            return $user;
        } catch (Exception $e) {
            throw new Exception('Failed to verify Google JWT token: '.$e->getMessage());
        }
    }
}
