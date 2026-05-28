<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\System;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<System>
 */
class SystemFactory extends Factory
{
    protected $model = System::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'cover_path' => '/storage/covers/'.fake()->uuid().'.png',
            'name' => fake()->sentence(3),
            'target_url' => fake()->url(),
            'repository_url' => fake()->url(),
        ];
    }
}
