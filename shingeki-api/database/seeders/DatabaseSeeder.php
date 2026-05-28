<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    private const int SEED_PROJECT_COUNT = 3;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'role' => 'user',
            ],
        );

        $projectsToCreate = self::SEED_PROJECT_COUNT - $user->projects()->count();

        if ($projectsToCreate > 0) {
            Project::factory($projectsToCreate)->for($user)->create();
        }
    }
}
