<?php

namespace Database\Factories;

use App\Enums\Signature\SignatureStatus;
use App\Models\Signature\Signature;
use App\Models\System\System;
use App\Models\User\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Signature>
 */
class SignatureFactory extends Factory
{
    protected $model = Signature::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'system_id' => System::factory(),
            'ip_address' => fake()->ipv4(),
            'token' => Str::random(64),
            'status' => SignatureStatus::Denied,
            'expiration' => now()->addDays(30),
        ];
    }

    public function permitted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => SignatureStatus::Permitted,
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'expiration' => now()->subDay(),
        ]);
    }
}
