<?php

use App\Enums\User\UserRole;
use App\Models\User\User;
use App\Services\Admin\AdminUserService;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

function actingAsPlatformAdmin(array $attributes = []): User
{
    $user = User::factory()->admin()->create($attributes);
    Sanctum::actingAs($user);

    return $user;
}

describe('GET /api/admin/users', function () {
    test('lists users for admins', function () {
        actingAsPlatformAdmin();
        User::factory()->count(2)->create();
        User::factory()->specialist()->create();

        $response = $this->getJson('/api/admin/users');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'users' => [
                    ['id', 'name', 'email', 'role', 'avatar_path', 'created_at', 'updated_at'],
                ],
                'pagination' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                    'from',
                    'to',
                ],
            ]);

        expect($response->json('pagination.total'))->toBeGreaterThanOrEqual(4);
    });

    test('filters users by search', function () {
        actingAsPlatformAdmin();
        User::factory()->create([
            'name' => 'Alice Specialist',
            'email' => 'alice@example.com',
        ]);
        User::factory()->create([
            'name' => 'Bob User',
            'email' => 'bob@example.com',
        ]);

        $response = $this->getJson('/api/admin/users?search=alice');

        $response->assertOk();
        expect($response->json('users'))->toHaveCount(1);
        expect($response->json('users.0.email'))->toBe('alice@example.com');
    });

    test('filters users by role', function () {
        actingAsPlatformAdmin();
        User::factory()->count(2)->create(['role' => UserRole::User]);
        User::factory()->specialist()->create([
            'name' => 'Only Specialist',
            'email' => 'only.specialist@example.com',
        ]);

        $response = $this->getJson('/api/admin/users?role=SPECIALIST');

        $response->assertOk();
        expect($response->json('users'))->not->toBeEmpty();
        foreach ($response->json('users') as $user) {
            expect($user['role'])->toBe('SPECIALIST');
        }
    });

    test('rejects invalid role filter', function () {
        actingAsPlatformAdmin();

        $this->getJson('/api/admin/users?role=SUPERADMIN')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);
    });

    test('forbids specialists from listing users', function () {
        Sanctum::actingAs(User::factory()->specialist()->create());

        $this->getJson('/api/admin/users')->assertForbidden();
    });

    test('forbids common users from listing users', function () {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/users')->assertForbidden();
    });
});

describe('PUT /api/admin/users/{user}', function () {
    test('updates another user role', function () {
        actingAsPlatformAdmin();
        $target = User::factory()->create(['role' => UserRole::User]);

        $response = $this->putJson('/api/admin/users/'.$target->id, [
            'role' => 'SPECIALIST',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.role', 'SPECIALIST')
            ->assertJsonPath('message', 'User role updated successfully.');

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'role' => 'SPECIALIST',
        ]);
    });

    test('can assign user role to another person', function () {
        actingAsPlatformAdmin();
        $target = User::factory()->specialist()->create();

        $this->putJson('/api/admin/users/'.$target->id, [
            'role' => 'USER',
        ])
            ->assertOk()
            ->assertJsonPath('user.role', 'USER');
    });

    test('forbids changing own role', function () {
        $admin = actingAsPlatformAdmin();

        $this->putJson('/api/admin/users/'.$admin->id, [
            'role' => 'SPECIALIST',
        ])->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'role' => 'ADMIN',
        ]);
    });

    test('rejects invalid role', function () {
        actingAsPlatformAdmin();
        $target = User::factory()->create();

        $this->putJson('/api/admin/users/'.$target->id, [
            'role' => 'SUPERADMIN',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);
    });
});

describe('DELETE /api/admin/users/{user}', function () {
    test('deletes another user', function () {
        actingAsPlatformAdmin();
        $target = User::factory()->create();

        $this->deleteJson('/api/admin/users/'.$target->id)
            ->assertOk()
            ->assertJsonPath('message', 'User deleted successfully.');

        $this->assertDatabaseMissing('users', [
            'id' => $target->id,
        ]);
    });

    test('forbids deleting own account', function () {
        $admin = actingAsPlatformAdmin();

        $this->deleteJson('/api/admin/users/'.$admin->id)
            ->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
        ]);
    });

    test('allows deleting an admin when another remains', function () {
        $actor = actingAsPlatformAdmin();
        $target = User::factory()->admin()->create();

        $this->deleteJson('/api/admin/users/'.$target->id)
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
        $this->assertDatabaseHas('users', [
            'id' => $actor->id,
            'role' => 'ADMIN',
        ]);
    });

    test('reassigns catalog attacks to the acting admin before delete', function () {
        $actor = actingAsPlatformAdmin();
        $target = User::factory()->specialist()->create();
        $attack = \App\Models\Attack\Attack::factory()->create([
            'user_id' => $target->id,
        ]);

        $this->deleteJson('/api/admin/users/'.$target->id)->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
        $this->assertDatabaseHas('attacks', [
            'id' => $attack->id,
            'user_id' => $actor->id,
        ]);
    });
});

describe('AdminUserService', function () {
    test('forbids changing own role', function () {
        $admin = User::factory()->admin()->create();
        $service = app(AdminUserService::class);

        expect(fn () => $service->updateRole($admin, $admin, UserRole::User))
            ->toThrow(AccessDeniedHttpException::class);
    });

    test('rejects demoting the last admin', function () {
        User::query()->where('role', UserRole::Admin)->delete();

        $soleAdmin = User::factory()->admin()->create();
        $actor = User::factory()->specialist()->create();
        $service = app(AdminUserService::class);

        expect(fn () => $service->updateRole($actor, $soleAdmin, UserRole::User))
            ->toThrow(ValidationException::class);
    });

    test('allows demoting an admin when another remains', function () {
        $actor = User::factory()->admin()->create();
        $target = User::factory()->admin()->create();
        $service = app(AdminUserService::class);

        $updated = $service->updateRole($actor, $target, UserRole::Specialist);

        expect($updated->role)->toBe(UserRole::Specialist);
        expect(User::query()->where('role', UserRole::Admin)->count())->toBeGreaterThanOrEqual(1);
    });

    test('forbids deleting own account', function () {
        $admin = User::factory()->admin()->create();
        $service = app(AdminUserService::class);

        expect(fn () => $service->delete($admin, $admin))
            ->toThrow(AccessDeniedHttpException::class);
    });

    test('rejects deleting the last admin', function () {
        User::query()->where('role', UserRole::Admin)->delete();

        $soleAdmin = User::factory()->admin()->create();
        $actor = User::factory()->specialist()->create();
        $service = app(AdminUserService::class);

        expect(fn () => $service->delete($actor, $soleAdmin))
            ->toThrow(ValidationException::class);
    });
});
