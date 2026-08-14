<?php

namespace Database\Factories;

use App\Enums\Scanning\AttackScanType;
use App\Models\Identity\User;
use App\Models\Scanning\AttackDispatch;
use App\Models\Workspace\System;
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
            'attacks_count' => 3,
            'dispatched_at' => now(),
        ];
    }
}
