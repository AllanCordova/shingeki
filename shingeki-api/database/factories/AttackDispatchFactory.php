<?php

namespace Database\Factories;

use App\Enums\Attack\AttackDepth;
use App\Enums\Attack\AttackScanType;
use App\Models\Attack\AttackDispatch;
use App\Models\System\System;
use App\Models\User\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AttackDispatch>
 */
class AttackDispatchFactory extends Factory
{
    protected $model = AttackDispatch::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'system_id' => System::factory(),
            'user_id' => User::factory(),
            'scan_type' => AttackScanType::Dast,
            'depth' => AttackDepth::Full,
            'attacks_count' => 3,
            'dispatched_at' => now(),
        ];
    }
}
