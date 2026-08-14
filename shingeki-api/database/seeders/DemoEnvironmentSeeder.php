<?php

namespace Database\Seeders;

use App\Enums\Identity\UserRole;
use App\Models\Identity\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class DemoEnvironmentSeeder extends Seeder
{
    use WithoutModelEvents;

    public const TEST_USER_EMAIL = 'test@example.com';

    public const ADMIN_USER_EMAIL = 'admin@admin.com';

    public function run(): void
    {
        $password = (string) env('DEMO_USER_PASSWORD', '');

        if ($password === '') {
            throw new RuntimeException(
                'DEMO_USER_PASSWORD must be set to seed local demo users. Catalog seeders do not create login accounts.',
            );
        }

        User::firstOrCreate(
            ['email' => self::TEST_USER_EMAIL],
            [
                'name' => 'Test User',
                'password' => Hash::make($password),
                'role' => UserRole::Specialist,
            ],
        );

        User::firstOrCreate(
            ['email' => self::ADMIN_USER_EMAIL],
            [
                'name' => 'Admin User',
                'password' => Hash::make($password),
                'role' => UserRole::Admin,
            ],
        );

        $this->call(VulnerableTargetSeeder::class);
        $this->call(DemoProjectsSeeder::class);
    }
}
