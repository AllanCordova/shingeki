<?php

namespace Database\Factories;

use App\Enums\TargetAccess\TargetAuthType;
use App\Models\Identity\User;
use App\Models\TargetAccess\SystemTargetSession;
use App\Models\Workspace\System;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SystemTargetSession>
 */
class SystemTargetSessionFactory extends Factory
{
    protected $model = SystemTargetSession::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'system_id' => System::factory(),
            'auth_type' => TargetAuthType::Cookie,
            'headers' => [
                'Cookie' => 'session=test-session-value',
            ],
            'expires_at' => null,
        ];
    }

    public function bearer(): static
    {
        return $this->state(fn () => [
            'auth_type' => TargetAuthType::Bearer,
            'headers' => [
                'Authorization' => 'Bearer test-token',
            ],
        ]);
    }
}
