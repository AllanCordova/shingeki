<?php

namespace Database\Factories;

use App\Models\Attack\Attack;
use App\Models\System\System;
use App\Models\System\SystemResult;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SystemResult>
 */
class SystemResultFactory extends Factory
{
    protected $model = SystemResult::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'system_id' => System::factory(),
            'attack_id' => Attack::factory(),
            'vulnerable_route' => '/api/login',
            'payload_used' => "' OR 1=1 --",
            'evidence' => 'Unexpected 500 response with SQL error in body.',
            'http_request' => "POST /api/login HTTP/1.1\r\nHost: app.example.com",
        ];
    }
}
