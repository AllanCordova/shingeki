<?php

namespace Database\Factories;

use App\Models\System\ManualRouteMap;
use App\Models\System\System;
use App\Models\User\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ManualRouteMap>
 */
class ManualRouteMapFactory extends Factory
{
    protected $model = ManualRouteMap::class;

    public function definition(): array
    {
        return [
            'system_id' => System::factory(),
            'user_id' => User::factory(),
            'name' => fake()->words(2, true),
            'method' => 'GET',
            'path' => '/'.fake()->slug(),
            'query' => null,
            'headers' => ['Accept' => 'text/html'],
            'body' => null,
            'content_type' => null,
            'notes' => null,
        ];
    }
}
