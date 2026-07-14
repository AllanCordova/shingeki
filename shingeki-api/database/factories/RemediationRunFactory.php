<?php

namespace Database\Factories;

use App\Enums\RemediationRunType;
use App\Models\AttackDispatch;
use App\Models\RemediationRun;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RemediationRun>
 */
class RemediationRunFactory extends Factory
{
    protected $model = RemediationRun::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'system_id' => System::factory(),
            'attack_dispatch_id' => AttackDispatch::factory(),
            'user_id' => User::factory(),
            'type' => RemediationRunType::CatalogSuggestion,
            'findings_count' => fake()->numberBetween(1, 10),
            'provider' => null,
            'model' => null,
        ];
    }

    public function ai(): static
    {
        return $this->state(fn () => [
            'type' => RemediationRunType::AiSuggestion,
            'provider' => 'gemini',
            'model' => 'gemini-2.0-flash',
        ]);
    }
}
