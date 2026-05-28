<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

const AUTH_REGISTER = '/api/auth/register';
const AUTH_LOGIN = '/api/auth/login';
const AUTH_LOGOUT = '/api/auth/logout';
const AUTH_ME = '/api/auth/me';

function validRegisterPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Test User',
        'email' => 'user@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ], $overrides);
}

function userJsonStructure(): array
{
    return [
        'id',
        'name',
        'email',
        'role',
        'created_at',
        'updated_at',
    ];
}

function createAuthenticatedUser(array $attributes = []): array
{
    $user = User::factory()->create($attributes);
    $token = $user->createToken('auth-token')->plainTextToken;

    return [$user, $token];
}

describe('POST /api/auth/register', function () {
    test('registers a user and returns token', function () {
        $response = $this->postJson(AUTH_REGISTER, validRegisterPayload());

        $response
            ->assertCreated()
            ->assertJson([
                'message' => 'User registered successfully.',
                'user' => [
                    'name' => 'Test User',
                    'email' => 'user@example.com',
                    'role' => 'user',
                ],
            ])
            ->assertJsonStructure([
                'message',
                'token',
                'user' => userJsonStructure(),
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'user@example.com',
            'role' => 'user',
        ]);

        expect($response->json('token'))->toBeString()->not->toBeEmpty();
    });

    test('rejects duplicate email', function () {
        User::factory()->create(['email' => 'user@example.com']);

        $this->postJson(AUTH_REGISTER, validRegisterPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    test('rejects invalid payload', function (array $payload, array $errors) {
        $this->postJson(AUTH_REGISTER, $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors($errors);
    })->with([
        'missing name' => [
            validRegisterPayload(['name' => null]),
            ['name'],
        ],
        'missing email' => [
            validRegisterPayload(['email' => null]),
            ['email'],
        ],
        'invalid email' => [
            validRegisterPayload(['email' => 'not-an-email']),
            ['email'],
        ],
        'short password' => [
            validRegisterPayload([
                'password' => 'short',
                'password_confirmation' => 'short',
            ]),
            ['password'],
        ],
        'password confirmation mismatch' => [
            validRegisterPayload(['password_confirmation' => 'different-password']),
            ['password'],
        ],
    ]);
});

describe('POST /api/auth/login', function () {
    test('logs in with valid credentials', function () {
        $user = User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson(AUTH_LOGIN, [
            'email' => 'login@example.com',
            'password' => 'password123',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Logged in successfully.',
                'user' => [
                    'id' => $user->id,
                    'email' => 'login@example.com',
                ],
            ])
            ->assertJsonStructure([
                'message',
                'token',
                'user' => userJsonStructure(),
            ]);

        expect($response->json('token'))->toBeString()->not->toBeEmpty();
    });

    test('rejects invalid credentials', function (array $credentials) {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'password123',
        ]);

        $this->postJson(AUTH_LOGIN, $credentials)
            ->assertUnauthorized()
            ->assertJson(['message' => 'Invalid credentials.']);
    })->with([
        'wrong password' => [[
            'email' => 'login@example.com',
            'password' => 'wrong-password',
        ]],
        'unknown email' => [[
            'email' => 'unknown@example.com',
            'password' => 'password123',
        ]],
    ]);

    test('rejects invalid payload', function () {
        $this->postJson(AUTH_LOGIN, [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    });
});

describe('POST /api/auth/logout', function () {
    test('logs out authenticated user and revokes token', function () {
        [$user, $token] = createAuthenticatedUser();

        $this->withToken($token)
            ->postJson(AUTH_LOGOUT)
            ->assertOk()
            ->assertJson(['message' => 'Logged out successfully.']);

        expect($user->fresh()->tokens)->toBeEmpty();
    });

    test('requires authentication', function () {
        $this->postJson(AUTH_LOGOUT)->assertUnauthorized();
    });
});

describe('GET /api/auth/me', function () {
    test('returns authenticated user', function () {
        $user = User::factory()->create([
            'name' => 'Authenticated User',
            'email' => 'me@example.com',
        ]);

        Sanctum::actingAs($user);

        $this->getJson(AUTH_ME)
            ->assertOk()
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'name' => 'Authenticated User',
                    'email' => 'me@example.com',
                    'role' => 'user',
                ],
            ])
            ->assertJsonStructure(['user' => userJsonStructure()]);
    });

    test('requires authentication', function () {
        $this->getJson(AUTH_ME)->assertUnauthorized();
    });
});

describe('PUT /api/auth/me', function () {
    test('updates profile fields', function () {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'old@example.com',
            'password' => 'old-password123',
        ]);

        Sanctum::actingAs($user);

        $this->putJson(AUTH_ME, [
            'name' => 'New Name',
            'email' => 'new@example.com',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
            'current_password' => 'old-password123',
        ])
            ->assertOk()
            ->assertJson([
                'message' => 'Profile updated successfully.',
                'user' => [
                    'name' => 'New Name',
                    'email' => 'new@example.com',
                ],
            ]);

        $user->refresh();

        expect($user->name)->toBe('New Name')
            ->and($user->email)->toBe('new@example.com')
            ->and(Hash::check('new-password123', $user->password))->toBeTrue();
    });

    test('updates only provided fields', function () {
        $user = User::factory()->create([
            'name' => 'Keep Name',
            'email' => 'keep@example.com',
        ]);

        Sanctum::actingAs($user);

        $this->putJson(AUTH_ME, ['name' => 'Updated Name'])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Name')
            ->assertJsonPath('user.email', 'keep@example.com');
    });

    test('rejects email already taken by another user', function () {
        User::factory()->create(['email' => 'taken@example.com']);
        $user = User::factory()->create(['email' => 'mine@example.com']);

        Sanctum::actingAs($user);

        $this->putJson(AUTH_ME, ['email' => 'taken@example.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    test('rejects password update without current password', function () {
        $user = User::factory()->create(['password' => 'password123']);

        Sanctum::actingAs($user);

        $this->putJson(AUTH_ME, [
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password']);
    });

    test('rejects password update with wrong current password', function () {
        $user = User::factory()->create(['password' => 'password123']);

        Sanctum::actingAs($user);

        $this->putJson(AUTH_ME, [
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
            'current_password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password']);
    });

    test('requires authentication', function () {
        $this->putJson(AUTH_ME, ['name' => 'Guest'])
            ->assertUnauthorized();
    });
});
