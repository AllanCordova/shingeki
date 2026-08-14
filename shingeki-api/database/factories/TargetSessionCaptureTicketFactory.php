<?php

namespace Database\Factories;

use App\Models\Identity\User;
use App\Models\TargetAccess\TargetSessionCaptureTicket;
use App\Models\Workspace\System;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TargetSessionCaptureTicket>
 */
class TargetSessionCaptureTicketFactory extends Factory
{
    protected $model = TargetSessionCaptureTicket::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'system_id' => System::factory(),
            'client_origin' => 'http://localhost:3000',
            'expires_at' => now()->addMinutes(15),
            'consumed_at' => null,
        ];
    }
}
