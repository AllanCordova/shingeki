<?php

namespace Database\Factories;

use App\Models\Catalog\Stack;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Stack>
 */
class StackFactory extends Factory
{
    protected $model = Stack::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $slug = fake()->unique()->slug(2);

        return [
            'slug' => $slug,
            'name' => ucfirst(str_replace('-', ' ', $slug)),
            'languages' => ['php'],
        ];
    }

    public function laravel(): static
    {
        return $this->state(fn () => [
            'slug' => 'laravel',
            'name' => 'Laravel',
            'languages' => ['php'],
        ]);
    }

    public function vanillaPhp(): static
    {
        return $this->state(fn () => [
            'slug' => 'vanilla_php',
            'name' => 'PHP',
            'languages' => ['php'],
        ]);
    }
}
