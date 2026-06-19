<?php

namespace Database\Factories;

use App\Models\AiRemediationSuggestion;
use App\Models\AttackDispatch;
use App\Models\SystemResult;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiRemediationSuggestion>
 */
class AiRemediationSuggestionFactory extends Factory
{
    protected $model = AiRemediationSuggestion::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'system_result_id' => SystemResult::factory(),
            'attack_dispatch_id' => AttackDispatch::factory(),
            'provider' => 'gemini',
            'model' => 'gemini-2.0-flash',
            'prompt_hash' => hash('sha256', 'test'),
            'response_json' => [
                'system_result_id' => fake()->uuid(),
                'location' => ['file' => 'login.php', 'line' => 18],
                'root_cause' => 'User input concatenated into SQL.',
                'risk_summary' => 'SQL injection risk.',
                'suggested_fix' => [
                    'description' => 'Use prepared statements.',
                    'code' => '$stmt = $pdo->prepare(...);',
                ],
                'validation' => [
                    'why_this_fixes' => 'Parameters are bound safely.',
                    'confidence' => 'high',
                    'syntax_valid' => true,
                ],
                'references' => ['https://owasp.org/www-community/attacks/SQL_Injection'],
            ],
        ];
    }
}
