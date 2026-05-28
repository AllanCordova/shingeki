<?php

namespace Database\Factories;

use App\Enums\AttackCategory;
use App\Enums\AttackRiskLevel;
use App\Enums\AttackTargetLocation;
use App\Models\Attack;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attack>
 */
class AttackFactory extends Factory
{
    protected $model = Attack::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'category' => AttackCategory::SqlInjection,
            'payload' => ['input' => "' OR 1=1 --"],
            'target_location' => AttackTargetLocation::Form,
            'risk_level' => AttackRiskLevel::High,
        ];
    }
}
