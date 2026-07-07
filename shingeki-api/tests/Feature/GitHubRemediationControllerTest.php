<?php

use App\Enums\AttackCategory;
use App\Enums\AttackScanType;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\GithubRemediationPullRequest;
use App\Models\Project;
use App\Models\Remediation;
use App\Models\Stack;
use App\Models\System;
use App\Models\SystemResult;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

function githubPrUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/remediate/github-pr';
}

describe('POST systems/remediate/github-pr', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $this->postJson(githubPrUrl($project, $system), [
            'finding_ids' => [fake()->uuid()],
        ])->assertUnauthorized();
    });

    test('creates github pull request for sast findings', function () {
        config([
            'ai.gemini.api_key' => 'test-gemini-key',
            'ai.provider' => 'gemini',
            'github.token' => 'ghp_test_token',
            'github.default_branch' => 'main',
        ]);

        $baseSha = 'abc123base';
        $fileSha = 'def456file';
        $originalContent = base64_encode("<?php\n\$query = \$_GET['q'];\necho \$query;\n");

        Http::fake([
            'raw.githubusercontent.com/*' => Http::response("<?php\n\$query = \$_GET['q'];\necho \$query;\n", 200),
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'location' => ['file' => 'search.php', 'line' => 3],
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
            'api.github.com/repos/AllanCordova/vulnerable-target/git/ref/heads/main' => Http::response([
                'object' => ['sha' => $baseSha],
            ], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs/heads/*' => Http::response(['message' => 'Not Found'], 404),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs' => Http::response([], 201),
            'api.github.com/repos/AllanCordova/vulnerable-target/contents/*' => Http::sequence()
                ->push([
                    'content' => $originalContent,
                    'sha' => $fileSha,
                ], 200)
                ->push([], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/pulls' => Http::response([
                'number' => 42,
                'html_url' => 'https://github.com/AllanCordova/vulnerable-target/pull/42',
            ], 201),
        ]);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/AllanCordova/vulnerable-target',
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
            'vulnerable_route' => 'search.php:3',
            'payload_used' => 'php.lang.security.xss',
            'evidence' => "Possible XSS\n\necho \$query;",
            'matched_snippet' => 'echo $query;',
            'source_file' => 'search.php',
            'start_line' => 3,
            'end_line' => 3,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson(githubPrUrl($project, $system), [
            'dispatch_id' => $dispatch->id,
            'finding_ids' => [$result->id],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('pull_request.number', 42)
            ->assertJsonPath('pull_request.url', 'https://github.com/AllanCordova/vulnerable-target/pull/42')
            ->assertJsonPath('files_changed', 1)
            ->assertJsonPath('findings_applied', 1);

        expect(GithubRemediationPullRequest::query()->where('system_id', $system->id)->exists())->toBeTrue();
    });

    test('rejects patch that leaves the vulnerable snippet in place', function () {
        config([
            'ai.gemini.api_key' => 'test-gemini-key',
            'ai.provider' => 'gemini',
            'github.token' => 'ghp_test_token',
            'github.default_branch' => 'main',
        ]);

        $baseSha = 'abc123base';
        $fileSha = 'def456file';
        $originalContent = base64_encode("<?php\n\$query = \$_GET['q'];\necho \$query;\n");

        Http::fake([
            'raw.githubusercontent.com/*' => Http::response("<?php\n\$query = \$_GET['q'];\necho \$query;\n", 200),
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'location' => ['file' => 'search.php', 'line' => 3],
                                        'root_cause' => 'Reflected user input without encoding.',
                                        'risk_summary' => 'XSS risk on search results.',
                                        'suggested_fix' => [
                                            'description' => 'Pretend fix that does not remove the sink.',
                                            'code' => "echo \$query; // sanitized",
                                        ],
                                        'validation' => [
                                            'why_this_fixes' => 'It does not, this is an incomplete patch.',
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
            'api.github.com/repos/AllanCordova/vulnerable-target/git/ref/heads/main' => Http::response([
                'object' => ['sha' => $baseSha],
            ], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs/heads/*' => Http::response(['message' => 'Not Found'], 404),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs' => Http::response([], 201),
            'api.github.com/repos/AllanCordova/vulnerable-target/contents/*' => Http::response([
                'content' => $originalContent,
                'sha' => $fileSha,
            ], 200),
        ]);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/AllanCordova/vulnerable-target',
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
            'vulnerable_route' => 'search.php:3',
            'payload_used' => 'php.lang.security.xss',
            'evidence' => "Possible XSS\n\necho \$query;",
            'matched_snippet' => 'echo $query;',
            'source_file' => 'search.php',
            'start_line' => 3,
            'end_line' => 3,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson(githubPrUrl($project, $system), [
            'dispatch_id' => $dispatch->id,
            'finding_ids' => [$result->id],
        ]);

        $response->assertStatus(422);
        expect($response->json('message'))->toContain('No findings could be safely remediated');

        Http::assertNotSent(fn ($request) => $request->method() === 'PUT'
            && str_contains($request->url(), '/contents/'));
        expect(GithubRemediationPullRequest::query()->where('system_id', $system->id)->exists())->toBeFalse();
    });

    test('merges duplicate fixes for multiple findings in the same file', function () {
        config([
            'ai.gemini.api_key' => 'test-gemini-key',
            'ai.provider' => 'gemini',
            'github.token' => 'ghp_test_token',
            'github.default_branch' => 'main',
        ]);

        $baseSha = 'abc123base';
        $fileSha = 'def456file';
        $rawFile = implode("\n", [
            '<?php',
            "\$file = \$_GET['f'] ?? 'welcome.txt';",
            "\$target = '/storage/'.\$file;",
            'if (! is_file($target)) {',
            "    exit('not found');",
            '}',
            'readfile($target);',
            '',
        ]);
        $fixBlock = implode("\n", [
            "\$file = basename(\$file);",
            "\$dir = realpath('/storage');",
            "\$resolved = realpath(\$dir.'/'.\$file);",
            'if ($resolved === false || ! str_starts_with($resolved, $dir) || ! is_file($resolved)) {',
            "    exit('denied');",
            '}',
            'readfile($resolved);',
        ]);
        $originalContent = base64_encode($rawFile);

        $putCount = 0;

        Http::fake([
            'raw.githubusercontent.com/*' => Http::response($rawFile, 200),
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'location' => ['file' => 'browse/index.php', 'line' => 4],
                                        'root_cause' => 'Path traversal via tainted filename.',
                                        'risk_summary' => 'Attacker can read arbitrary files.',
                                        'suggested_fix' => [
                                            'description' => 'Validate and confine to storage dir.',
                                            'code' => $fixBlock,
                                        ],
                                        'validation' => [
                                            'why_this_fixes' => 'realpath confines reads to the storage directory.',
                                            'confidence' => 'high',
                                            'syntax_valid' => true,
                                        ],
                                        'references' => ['https://owasp.org/www-community/attacks/Path_Traversal'],
                                    ], JSON_THROW_ON_ERROR),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/ref/heads/main' => Http::response([
                'object' => ['sha' => $baseSha],
            ], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs/heads/*' => Http::response(['message' => 'Not Found'], 404),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs' => Http::response([], 201),
            'api.github.com/repos/AllanCordova/vulnerable-target/contents/*' => function ($request) use (&$putCount, $originalContent, $fileSha) {
                if ($request->method() === 'PUT') {
                    $putCount++;

                    return Http::response([], 200);
                }

                return Http::response([
                    'content' => $originalContent,
                    'sha' => $fileSha,
                ], 200);
            },
            'api.github.com/repos/AllanCordova/vulnerable-target/pulls' => Http::response([
                'number' => 77,
                'html_url' => 'https://github.com/AllanCordova/vulnerable-target/pull/77',
            ], 201),
        ]);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/AllanCordova/vulnerable-target',
        ]);
        $stack = Stack::factory()->create(['slug' => 'vanilla_php', 'languages' => ['php']]);
        $system->stacks()->attach($stack->id, ['is_primary' => true]);

        Remediation::factory()->for($stack)->create([
            'attack_category' => AttackCategory::SqlInjection,
            'scan_type' => AttackScanType::Sast,
        ]);

        $attack = Attack::factory()->for($user)->create([
            'category' => AttackCategory::SqlInjection,
        ]);

        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'scan_type' => AttackScanType::Sast,
            'completed_at' => now(),
        ]);

        $findingOne = SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
            'vulnerable_route' => 'browse/index.php:4',
            'payload_used' => 'php.lang.security.injection.tainted-filename.tainted-filename',
            'evidence' => 'Tainted filename',
            'matched_snippet' => 'if (! is_file($target)) {',
            'source_file' => 'browse/index.php',
            'start_line' => 4,
            'end_line' => 4,
        ]);

        $findingTwo = SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
            'vulnerable_route' => 'browse/index.php:7',
            'payload_used' => 'php.lang.security.injection.tainted-filename.tainted-filename',
            'evidence' => 'Tainted filename',
            'matched_snippet' => 'readfile($target);',
            'source_file' => 'browse/index.php',
            'start_line' => 7,
            'end_line' => 7,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson(githubPrUrl($project, $system), [
            'dispatch_id' => $dispatch->id,
            'finding_ids' => [$findingOne->id, $findingTwo->id],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('files_changed', 1)
            ->assertJsonCount(0, 'skipped_files');

        expect($putCount)->toBe(1);
    });

    test('rejects sql fix that leaves a dangling variable sink', function () {
        config([
            'ai.gemini.api_key' => 'test-gemini-key',
            'ai.provider' => 'gemini',
            'github.token' => 'ghp_test_token',
            'github.default_branch' => 'main',
        ]);

        $baseSha = 'abc123base';
        $fileSha = 'def456file';
        $rawFile = "<?php\n\$sql = \"UPDATE users SET email = '\".\$email.\"' WHERE id = \".(int) \$id;\ndb()->exec(\$sql);\naudit_log(\$sql);\n";
        $originalContent = base64_encode($rawFile);

        Http::fake([
            'raw.githubusercontent.com/*' => Http::response($rawFile, 200),
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'location' => ['file' => 'profile.php', 'line' => 2],
                                        'root_cause' => 'Unsanitized input concatenated into SQL.',
                                        'risk_summary' => 'SQL injection on profile update.',
                                        'suggested_fix' => [
                                            'description' => 'Use prepared statements.',
                                            'code' => "\$stmt = db()->prepare('UPDATE users SET email = :email WHERE id = :id');\n\$stmt->execute(['email' => \$email, 'id' => (int) \$id]);",
                                        ],
                                        'validation' => [
                                            'why_this_fixes' => 'Prepared statements separate code from data.',
                                            'confidence' => 'high',
                                            'syntax_valid' => true,
                                        ],
                                        'references' => ['https://owasp.org/www-community/attacks/sql-injection/'],
                                    ], JSON_THROW_ON_ERROR),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/ref/heads/main' => Http::response([
                'object' => ['sha' => $baseSha],
            ], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs/heads/*' => Http::response(['message' => 'Not Found'], 404),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs' => Http::response([], 201),
            'api.github.com/repos/AllanCordova/vulnerable-target/contents/*' => Http::response([
                'content' => $originalContent,
                'sha' => $fileSha,
            ], 200),
        ]);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/AllanCordova/vulnerable-target',
        ]);
        $stack = Stack::factory()->create(['slug' => 'vanilla_php', 'languages' => ['php']]);
        $system->stacks()->attach($stack->id, ['is_primary' => true]);

        Remediation::factory()->for($stack)->create([
            'attack_category' => AttackCategory::SqlInjection,
            'scan_type' => AttackScanType::Sast,
        ]);

        $attack = Attack::factory()->for($user)->create([
            'category' => AttackCategory::SqlInjection,
        ]);

        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'scan_type' => AttackScanType::Sast,
            'completed_at' => now(),
        ]);

        $result = SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
            'vulnerable_route' => 'profile.php:2',
            'payload_used' => 'php.lang.security.injection.tainted-sql-string.tainted-sql-string',
            'evidence' => "Tainted SQL\n\n\$sql = \"UPDATE users SET email = '\".\$email.\"' WHERE id = \".(int) \$id;",
            'matched_snippet' => "\$sql = \"UPDATE users SET email = '\".\$email.\"' WHERE id = \".(int) \$id;",
            'source_file' => 'profile.php',
            'start_line' => 2,
            'end_line' => 2,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson(githubPrUrl($project, $system), [
            'dispatch_id' => $dispatch->id,
            'finding_ids' => [$result->id],
        ]);

        $response->assertStatus(422);
        expect($response->json('message'))->toContain('dangling use of $sql');

        Http::assertNotSent(fn ($request) => $request->method() === 'PUT'
            && str_contains($request->url(), '/contents/'));
        expect(GithubRemediationPullRequest::query()->where('system_id', $system->id)->exists())->toBeFalse();
    });

    test('resets remediation branch to base before applying patches', function () {
        config([
            'ai.gemini.api_key' => 'test-gemini-key',
            'ai.provider' => 'gemini',
            'github.token' => 'ghp_test_token',
            'github.default_branch' => 'main',
        ]);

        $baseSha = 'abc123base';
        $fileSha = 'def456file';
        $originalContent = base64_encode("<?php\n\$query = \$_GET['q'];\necho \$query;\n");

        Http::fake([
            'raw.githubusercontent.com/*' => Http::response("<?php\n\$query = \$_GET['q'];\necho \$query;\n", 200),
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'location' => ['file' => 'search.php', 'line' => 3],
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
            'api.github.com/repos/AllanCordova/vulnerable-target/git/ref/heads/main' => Http::response([
                'object' => ['sha' => $baseSha],
            ], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs/heads/*' => Http::response([], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/contents/*' => Http::sequence()
                ->push([
                    'content' => $originalContent,
                    'sha' => $fileSha,
                ], 200)
                ->push([], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/pulls' => Http::response([
                'number' => 43,
                'html_url' => 'https://github.com/AllanCordova/vulnerable-target/pull/43',
            ], 201),
        ]);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/AllanCordova/vulnerable-target',
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
            'vulnerable_route' => 'search.php:3',
            'payload_used' => 'php.lang.security.xss',
            'evidence' => "Possible XSS\n\necho \$query;",
            'matched_snippet' => 'echo $query;',
            'source_file' => 'search.php',
            'start_line' => 3,
            'end_line' => 3,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson(githubPrUrl($project, $system), [
            'dispatch_id' => $dispatch->id,
            'finding_ids' => [$result->id],
        ]);

        $response->assertCreated();

        Http::assertSent(function ($request) use ($baseSha) {
            return $request->method() === 'PATCH'
                && str_contains($request->url(), '/git/refs/heads/fix-security-')
                && ($request->data()['sha'] ?? null) === $baseSha;
        });
    });

    test('skips files missing from github repository and still opens pull request', function () {
        config([
            'ai.gemini.api_key' => 'test-gemini-key',
            'ai.provider' => 'gemini',
            'github.token' => 'ghp_test_token',
            'github.default_branch' => 'main',
            'github.repository_source_prefix' => 'shingeki-vulnerable-target',
        ]);

        $baseSha = 'abc123base';
        $fileSha = 'def456file';
        $originalContent = base64_encode("<?php\n\$query = \$_GET['q'];\necho \$query;\n");
        $aiPayload = [
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            [
                                'text' => json_encode([
                                    'location' => ['file' => 'public/search.php', 'line' => 13],
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
        ];

        Http::fake(function ($request) use ($baseSha, $fileSha, $originalContent, $aiPayload) {
            $url = $request->url();

            if (str_contains($url, 'generativelanguage.googleapis.com')) {
                return Http::response($aiPayload, 200);
            }

            if (str_contains($url, 'raw.githubusercontent.com')) {
                return Http::response("<?php\n\$query = \$_GET['q'];\necho \$query;\n", 200);
            }

            if (str_contains($url, '/git/ref/heads/main')) {
                return Http::response(['object' => ['sha' => $baseSha]], 200);
            }

            if (str_contains($url, '/git/refs/heads/') && $request->method() === 'PATCH') {
                return Http::response(['message' => 'Not Found'], 404);
            }

            if (str_contains($url, '/git/refs') && $request->method() === 'POST') {
                return Http::response([], 201);
            }

            if (str_contains($url, '/contents/') && $request->method() === 'GET') {
                if (str_contains($url, 'notes.php')) {
                    return Http::response(['message' => 'Not Found'], 404);
                }

                return Http::response([
                    'content' => $originalContent,
                    'sha' => $fileSha,
                ], 200);
            }

            if (str_contains($url, '/contents/') && $request->method() === 'PUT') {
                return Http::response([], 200);
            }

            if (str_contains($url, '/pulls') && $request->method() === 'POST') {
                return Http::response([
                    'number' => 44,
                    'html_url' => 'https://github.com/AllanCordova/vulnerable-target/pull/44',
                ], 201);
            }

            return Http::response(['message' => 'Unexpected GitHub request: '.$url], 500);
        });

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/AllanCordova/vulnerable-target',
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

        $searchResult = SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
            'vulnerable_route' => 'public/search.php:13',
            'payload_used' => 'php.lang.security.xss',
            'evidence' => "Possible XSS\n\necho \$query;",
            'matched_snippet' => 'echo $query;',
            'source_file' => 'public/search.php',
            'start_line' => 13,
            'end_line' => 13,
        ]);

        $notesResult = SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
            'vulnerable_route' => 'public/notes.php:17',
            'payload_used' => 'php.lang.security.xss',
            'evidence' => "Possible XSS\n\necho \$query;",
            'matched_snippet' => 'echo $query;',
            'source_file' => 'public/notes.php',
            'start_line' => 17,
            'end_line' => 17,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson(githubPrUrl($project, $system), [
            'dispatch_id' => $dispatch->id,
            'finding_ids' => [$searchResult->id, $notesResult->id],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('files_changed', 1)
            ->assertJsonPath('findings_applied', 1)
            ->assertJsonPath('skipped_files.0.scan_path', 'public/notes.php')
            ->assertJsonCount(1, 'skipped_files')
            ->assertJsonCount(1, 'warnings');
    });

    test('returns compare link when token cannot create pull requests', function () {
        config([
            'ai.gemini.api_key' => 'test-gemini-key',
            'ai.provider' => 'gemini',
            'github.token' => 'ghp_test_token',
            'github.default_branch' => 'main',
        ]);

        $baseSha = 'abc123base';
        $fileSha = 'def456file';
        $originalContent = base64_encode("<?php\n\$query = \$_GET['q'];\necho \$query;\n");

        Http::fake([
            'raw.githubusercontent.com/*' => Http::response("<?php\n\$query = \$_GET['q'];\necho \$query;\n", 200),
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'location' => ['file' => 'search.php', 'line' => 3],
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
            'api.github.com/repos/AllanCordova/vulnerable-target/git/ref/heads/main' => Http::response([
                'object' => ['sha' => $baseSha],
            ], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs/heads/*' => Http::response(['message' => 'Not Found'], 404),
            'api.github.com/repos/AllanCordova/vulnerable-target/git/refs' => Http::response([], 201),
            'api.github.com/repos/AllanCordova/vulnerable-target/contents/*' => Http::sequence()
                ->push([
                    'content' => $originalContent,
                    'sha' => $fileSha,
                ], 200)
                ->push([], 200),
            'api.github.com/repos/AllanCordova/vulnerable-target/pulls*' => Http::response([
                'message' => 'Resource not accessible by personal access token',
            ], 403),
        ]);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/AllanCordova/vulnerable-target',
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
            'vulnerable_route' => 'search.php:3',
            'payload_used' => 'php.lang.security.xss',
            'evidence' => "Possible XSS\n\necho \$query;",
            'matched_snippet' => 'echo $query;',
            'source_file' => 'search.php',
            'start_line' => 3,
            'end_line' => 3,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson(githubPrUrl($project, $system), [
            'dispatch_id' => $dispatch->id,
            'finding_ids' => [$result->id],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('pull_request.compare_only', true)
            ->assertJsonPath('pull_request.number', 0)
            ->assertJsonPath(
                'pull_request.url',
                'https://github.com/AllanCordova/vulnerable-target/compare/main...fix-security-'.substr(str_replace('-', '', $dispatch->id), 0, 8).'?expand=1',
            )
            ->assertJsonPath('files_changed', 1);
    });

    test('rejects dast dispatches', function () {
        config(['github.token' => 'ghp_test_token']);

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'repository_url' => 'https://github.com/AllanCordova/vulnerable-target',
        ]);
        $stack = Stack::factory()->create();
        $system->stacks()->attach($stack->id, ['is_primary' => true]);

        $attack = Attack::factory()->for($user)->create();
        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'scan_type' => AttackScanType::Dast,
            'completed_at' => now(),
        ]);
        $result = SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
        ]);

        Sanctum::actingAs($user);

        $this->postJson(githubPrUrl($project, $system), [
            'dispatch_id' => $dispatch->id,
            'finding_ids' => [$result->id],
        ])->assertStatus(422)
            ->assertJsonPath('message', 'GitHub remediation pull requests are supported for SAST dispatches only.');
    });
});
