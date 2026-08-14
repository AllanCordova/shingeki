<?php

use App\Enums\Catalog\AttackCategory;
use App\Enums\Scanning\AttackScanType;
use App\Models\Catalog\Attack;
use App\Models\Catalog\Remediation;
use App\Models\Catalog\Stack;
use App\Models\Identity\User;
use App\Models\Remediation\AiRemediationSuggestion;
use App\Models\Scanning\AttackDispatch;
use App\Models\Scanning\SystemResult;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

function remediateAiUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/remediate/ai';
}

describe('POST systems/remediate/ai', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $this->postJson(remediateAiUrl($project, $system))
            ->assertUnauthorized();
    });

    test('generates ai suggestions for sast findings', function () {
        config([
            'ai.gemini.api_key' => 'test-gemini-key',
            'ai.provider' => 'gemini',
        ]);

        Http::fake([
            'raw.githubusercontent.com/*' => Http::response("<?php\n\$query = \$_GET['q'];\necho \$query;\n", 200),
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'location' => ['file' => 'search.php', 'line' => 2],
                                        'root_cause' => 'Reflected user input without encoding.',
                                        'risk_summary' => 'XSS risk on search results.',
                                        'suggested_fix' => [
                                            'description' => 'Escape output with htmlspecialchars.',
                                            'code' => "echo htmlspecialchars(\$query, ENT_QUOTES, 'UTF-8');",
                                        ],
                                        'validation' => [
                                            'why_this_fixes' => 'Encoding neutralizes HTML in user input.',
                                            'confidence' => 'high',
                                            'syntax_valid' => true,
                                        ],
                                        'references' => ['https://owasp.org/www-community/attacks/xss/'],
                                    ], JSON_THROW_ON_ERROR),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/shingeki/vulnerable-target',
        ]);
        $stack = Stack::factory()->create(['slug' => 'vanilla_php', 'languages' => ['php']]);
        $system->stacks()->attach($stack->id, ['is_primary' => true]);

        Remediation::factory()->for($stack)->create([
            'attack_category' => AttackCategory::Xss,
            'scan_type' => AttackScanType::Sast,
        ]);

        $attack = Attack::factory()->for($user)->create([
            'category' => AttackCategory::Xss,
        ]);

        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'scan_type' => AttackScanType::Sast,
            'completed_at' => now(),
        ]);

        $result = SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
            'vulnerable_route' => 'search.php:2',
            'payload_used' => 'php.lang.security.xss',
            'evidence' => 'User input echoed without encoding.',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson(remediateAiUrl($project, $system), [
            'dispatch_id' => $dispatch->id,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('provider', 'gemini')
            ->assertJsonPath('findings_count', 1)
            ->assertJsonPath('findings.0.ai_suggestion.root_cause', 'Reflected user input without encoding.')
            ->assertJsonPath('findings.0.source_context.origin', 'repository');

        expect(AiRemediationSuggestion::query()->where('system_result_id', $result->id)->exists())->toBeTrue();
    });

    test('reuses cached suggestion on second request', function () {
        config([
            'ai.gemini.api_key' => 'test-gemini-key',
            'ai.provider' => 'gemini',
        ]);

        $llmResponse = [
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            [
                                'text' => json_encode([
                                    'location' => ['file' => 'app.php', 'line' => 1],
                                    'root_cause' => 'Cached cause',
                                    'risk_summary' => 'Cached risk',
                                    'suggested_fix' => [
                                        'description' => 'Cached fix',
                                        'code' => 'echo "ok";',
                                    ],
                                    'validation' => [
                                        'why_this_fixes' => 'Cached',
                                        'confidence' => 'high',
                                        'syntax_valid' => true,
                                    ],
                                    'references' => [],
                                ], JSON_THROW_ON_ERROR),
                            ],
                        ],
                    ],
                ],
            ],
        ];

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response($llmResponse, 200),
        ]);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $stack = Stack::factory()->laravel()->create();
        $system->stacks()->attach($stack->id, ['is_primary' => true]);

        $attack = Attack::factory()->for($user)->create();
        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now(),
        ]);

        SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
        ]);

        Sanctum::actingAs($user);

        $url = remediateAiUrl($project, $system);
        $payload = ['dispatch_id' => $dispatch->id];

        $this->postJson($url, $payload)
            ->assertOk()
            ->assertJsonPath('findings.0.cached', false);

        $this->postJson($url, $payload)
            ->assertOk()
            ->assertJsonPath('findings.0.cached', true);

        Http::assertSentCount(1);
    });

    test('returns service unavailable when no ai provider configured', function () {
        config([
            'ai.gemini.api_key' => null,
            'ai.groq.api_key' => null,
        ]);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $stack = Stack::factory()->laravel()->create();
        $system->stacks()->attach($stack->id, ['is_primary' => true]);

        $attack = Attack::factory()->for($user)->create();
        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now(),
        ]);
        SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
        ]);

        Sanctum::actingAs($user);

        $this->postJson(remediateAiUrl($project, $system))
            ->assertStatus(503);
    });
});
