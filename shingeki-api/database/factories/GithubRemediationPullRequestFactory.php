<?php

namespace Database\Factories;

use App\Models\Identity\User;
use App\Models\Remediation\GithubRemediationPullRequest;
use App\Models\Scanning\AttackDispatch;
use App\Models\Workspace\System;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GithubRemediationPullRequest>
 */
class GithubRemediationPullRequestFactory extends Factory
{
    protected $model = GithubRemediationPullRequest::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'system_id' => System::factory(),
            'attack_dispatch_id' => AttackDispatch::factory(),
            'user_id' => User::factory(),
            'github_pr_number' => fake()->numberBetween(1, 9999),
            'github_pr_url' => fake()->url(),
            'head_branch' => 'fix-security-'.fake()->uuid(),
            'base_branch' => 'main',
            'finding_ids' => [fake()->uuid()],
            'files_changed' => 1,
        ];
    }
}
