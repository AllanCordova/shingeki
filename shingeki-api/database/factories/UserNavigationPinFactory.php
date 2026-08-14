<?php

namespace Database\Factories;

use App\Models\Identity\User;
use App\Models\Workspace\Project;
use App\Models\Workspace\UserNavigationPin;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserNavigationPin>
 */
class UserNavigationPinFactory extends Factory
{
    protected $model = UserNavigationPin::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'project_id' => Project::factory(),
            'system_id' => null,
            'system_key' => '',
            'visible' => true,
            'sort_order' => 0,
        ];
    }
}
