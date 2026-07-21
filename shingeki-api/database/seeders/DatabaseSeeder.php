<?php

namespace Database\Seeders;

use App\Enums\User\UserRole;
use App\Models\User\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(AttackCatalogSeeder::class);
        $this->call(StackCatalogSeeder::class);
        $this->call(RemediationCatalogSeeder::class);

        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'role' => UserRole::Specialist,
            ],
        );

        User::firstOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'role' => UserRole::Admin,
            ],
        );

        // $this->call(UsersSeeder::class);
        $this->call(VulnerableTargetSeeder::class);
        $this->call(DemoProjectsSeeder::class);
    }
}
