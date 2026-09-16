<?php

use App\Enums\User\UserRole;
use App\Models\User\User;
use App\Services\Auth\GoogleAuthService;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Two\User as SocialiteUser;

describe('GoogleAuthService', function () {
    test('upserts new user from verified google identity', function () {
        $google = (new SocialiteUser)->map([
            'id' => 'google-sub-1',
            'nickname' => null,
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
            'avatar' => null,
        ])->setRaw([
            'sub' => 'google-sub-1',
            'email' => 'ada@example.com',
            'email_verified' => true,
            'name' => 'Ada Lovelace',
        ]);

        $user = app(GoogleAuthService::class)->upsertFromGoogleUser($google);

        expect($user->google_id)->toBe('google-sub-1')
            ->and($user->email)->toBe('ada@example.com')
            ->and($user->password)->toBeNull()
            ->and($user->role)->toBe(UserRole::User);
    });

    test('links google id to existing email account', function () {
        $existing = User::factory()->create([
            'email' => 'linked@example.com',
            'password' => 'password123',
        ]);

        $google = (new SocialiteUser)->map([
            'id' => 'google-sub-2',
            'nickname' => null,
            'name' => 'Linked User',
            'email' => 'linked@example.com',
            'avatar' => null,
        ])->setRaw([
            'sub' => 'google-sub-2',
            'email' => 'linked@example.com',
            'email_verified' => true,
        ]);

        $user = app(GoogleAuthService::class)->upsertFromGoogleUser($google);

        expect($user->id)->toBe($existing->id)
            ->and($user->google_id)->toBe('google-sub-2')
            ->and(Hash::check('password123', $user->password))->toBeTrue();
    });

    test('rejects unverified google email', function () {
        $google = (new SocialiteUser)->map([
            'id' => 'google-sub-3',
            'nickname' => null,
            'name' => 'Unverified',
            'email' => 'nope@example.com',
            'avatar' => null,
        ])->setRaw([
            'sub' => 'google-sub-3',
            'email' => 'nope@example.com',
            'email_verified' => false,
        ]);

        app(GoogleAuthService::class)->upsertFromGoogleUser($google);
    })->throws(RuntimeException::class, 'Google email is not verified.');

    test('handoff code can be exchanged once', function () {
        $user = User::factory()->create();
        $service = app(GoogleAuthService::class);
        $nonce = 'test-nonce-value-32chars-minimum!!';

        $handoff = $service->createHandoff($user, $nonce);
        $first = $service->consumeHandoff($handoff['code'], $nonce);

        expect($first['token'])->toBeString()->not->toBeEmpty()
            ->and($first['user']->id)->toBe($user->id);

        $service->consumeHandoff($handoff['code'], $nonce);
    })->throws(RuntimeException::class);

    test('rejects handoff when nonce does not match', function () {
        $user = User::factory()->create();
        $service = app(GoogleAuthService::class);
        $handoff = $service->createHandoff($user, 'expected-nonce-value-here!!!!');

        $service->consumeHandoff($handoff['code'], 'wrong-nonce-value-here!!!!!!');
    })->throws(RuntimeException::class, 'Invalid Google login nonce.');
});

describe('POST /api/auth/google/exchange', function () {
    test('returns sanctum token for valid handoff code', function () {
        $user = User::factory()->create();
        $nonce = 'exchange-nonce-value-32chars-min!!';
        $handoff = app(GoogleAuthService::class)->createHandoff($user, $nonce);

        $this->postJson('/api/auth/google/exchange', [
            'code' => $handoff['code'],
            'nonce' => $nonce,
        ])
            ->assertOk()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonStructure(['message', 'token', 'user']);
    });

    test('rejects missing or invalid code', function () {
        $this->postJson('/api/auth/google/exchange', [])
            ->assertUnprocessable();

        $this->postJson('/api/auth/google/exchange', [
            'code' => 'invalid',
            'nonce' => 'some-nonce-value-32chars-minimum!',
        ])->assertUnauthorized();
    });
});

describe('POST /api/auth/login with google-only user', function () {
    test('rejects password login when password is null', function () {
        User::factory()->create([
            'email' => 'google-only@example.com',
            'password' => null,
            'google_id' => 'google-sub-only',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'google-only@example.com',
            'password' => 'anything123',
        ])->assertUnauthorized()
            ->assertJson(['message' => 'Invalid credentials.']);
    });
});
