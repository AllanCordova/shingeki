<?php

namespace Database\Factories;

use App\Enums\DispatchProbeOutcome;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\DispatchProbe;
use App\Models\System;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DispatchProbe>
 */
class DispatchProbeFactory extends Factory
{
    protected $model = DispatchProbe::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'attack_dispatch_id' => AttackDispatch::factory(),
            'system_id' => System::factory(),
            'attack_id' => Attack::factory(),
            'route' => fake()->url(),
            'payload_used' => "' OR 1=1 --",
            'http_request' => 'POST /login.php HTTP/1.1',
            'outcome' => DispatchProbeOutcome::Clean,
            'evidence' => 'HTTP 200 · nenhum indicador detectado',
            'error_message' => null,
        ];
    }
}
