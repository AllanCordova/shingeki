<?php

namespace Database\Factories;

use App\Models\Project\Project;
use App\Models\User\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'cover_path' => '/storage/covers/'.fake()->uuid().'.png',
            'name' => fake()->sentence(3),
            'description' => fake()->paragraph(),
        ];
    }
}
