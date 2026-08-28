<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User\User;
use App\Services\Auth\GoogleAuthService;
use App\Socialite\GoogleOidcProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Cookie;
use Throwable;

class GoogleAuthController extends Controller
{
    private const FRONTEND_ORIGIN_COOKIE = 'shingeki_google_frontend_origin';

    private const LOGIN_NONCE_COOKIE = 'shingeki_google_login_nonce';

    public function __construct(
        private readonly GoogleAuthService $googleAuth,
    ) {}

    /**
     * Stateless OIDC start. Stores browser origin + a login nonce so the BFF
     * exchange cannot be completed from another browser (login CSRF).
     */
    public function redirect(Request $request): RedirectResponse
    {
        $origin = $this->resolveFrontendOrigin($request->query('origin'));
        $nonce = $request->query('nonce');

        if (! is_string($nonce) || strlen($nonce) < 32) {
            $nonce = Str::random(40);
        }

        /** @var GoogleOidcProvider $driver */
        $driver = Socialite::driver('google');

        return $driver->stateless()
            ->redirect()
            ->withCookie($this->frontendOriginCookie($origin))
            ->withCookie($this->loginNonceCookie($nonce));
    }

    public function callback(Request $request): RedirectResponse
    {
        $frontend = $this->resolveFrontendOrigin(
            $request->cookie(self::FRONTEND_ORIGIN_COOKIE)
        );
        $nonce = $request->cookie(self::LOGIN_NONCE_COOKIE);

        try {
            if (! is_string($nonce) || $nonce === '') {
                throw new \RuntimeException('Missing Google login nonce.');
            }

            /** @var GoogleOidcProvider $driver */
            $driver = Socialite::driver('google');
            $googleUser = $driver->stateless()->userFromOidcCallback();

            $user = $this->googleAuth->upsertFromGoogleUser($googleUser);
            $handoff = $this->googleAuth->createHandoff($user, $nonce);

            $query = http_build_query([
                'code' => $handoff['code'],
            ]);

            return redirect()
                ->away("{$frontend}/api/auth/google/callback?{$query}")
                ->withCookie($this->forgetFrontendOriginCookie())
                ->withCookie($this->forgetLoginNonceCookie());
        } catch (Throwable $e) {
            Log::warning('Google OIDC login failed.', [
                'message' => $e->getMessage(),
                'exception' => $e::class,
            ]);

            return redirect()
                ->away("{$frontend}/login?error=google_auth_failed")
                ->withCookie($this->forgetFrontendOriginCookie())
                ->withCookie($this->forgetLoginNonceCookie());
        }
    }

    public function exchange(Request $request): JsonResponse
    {
        $code = $request->input('code');
        $nonce = $request->input('nonce');

        if (! is_string($code) || $code === '') {
            return response()->json([
                'message' => 'Missing Google login code.',
            ], 422);
        }

        if (! is_string($nonce) || $nonce === '') {
            return response()->json([
                'message' => 'Missing Google login nonce.',
            ], 422);
        }

        try {
            $session = $this->googleAuth->consumeHandoff($code, $nonce);
        } catch (Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 401);
        }

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => $this->formatUser($session['user']),
            'token' => $session['token'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_path' => $user->avatar_path,
            'role' => $user->role->value,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }

    private function resolveFrontendOrigin(mixed $candidate): string
    {
        $default = rtrim((string) config('frontend.url'), '/');
        /** @var list<string> $allowed */
        $allowed = config('frontend.allowed_origins', [$default]);

        if (! is_string($candidate) || $candidate === '') {
            return $default;
        }

        $candidate = rtrim($candidate, '/');

        if (in_array($candidate, $allowed, true)) {
            return $candidate;
        }

        return $default;
    }

    private function frontendOriginCookie(string $origin): Cookie
    {
        return cookie(
            name: self::FRONTEND_ORIGIN_COOKIE,
            value: $origin,
            minutes: 10,
            path: '/',
            domain: null,
            secure: app()->isProduction(),
            httpOnly: true,
            raw: false,
            sameSite: 'lax',
        );
    }

    private function forgetFrontendOriginCookie(): Cookie
    {
        return cookie(
            name: self::FRONTEND_ORIGIN_COOKIE,
            value: '',
            minutes: -1,
            path: '/',
            domain: null,
            secure: app()->isProduction(),
            httpOnly: true,
            raw: false,
            sameSite: 'lax',
        );
    }

    private function loginNonceCookie(string $nonce): Cookie
    {
        return cookie(
            name: self::LOGIN_NONCE_COOKIE,
            value: $nonce,
            minutes: 10,
            path: '/',
            domain: null,
            secure: app()->isProduction(),
            httpOnly: true,
            raw: false,
            sameSite: 'lax',
        );
    }

    private function forgetLoginNonceCookie(): Cookie
    {
        return cookie(
            name: self::LOGIN_NONCE_COOKIE,
            value: '',
            minutes: -1,
            path: '/',
            domain: null,
            secure: app()->isProduction(),
            httpOnly: true,
            raw: false,
            sameSite: 'lax',
        );
    }
}
