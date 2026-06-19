<?php

use App\Enums\AttackCategory;
use App\Enums\AttackScanType;
use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\Remediation;
use App\Models\Stack;
use App\Models\System;
use App\Models\SystemResult;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function remediateUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/remediate';
}

describe('POST systems/remediate', function () {
    test('returns remediation suggestions for latest completed dispatch', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $stack = Stack::factory()->laravel()->create();
        $system->stacks()->attach($stack->id, ['is_primary' => true]);

        Remediation::factory()->for($stack)->create([
            'attack_category' => AttackCategory::SqlInjection,
            'title' => 'Fix SQL injection',
        ]);

        $attack = Attack::factory()->for($user)->create([
            'category' => AttackCategory::SqlInjection,
        ]);
        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'scan_type' => AttackScanType::Dast,
            'completed_at' => now(),
        ]);
        SystemResult::factory()
            ->for($system)
            ->for($attack)
            ->create(['attack_dispatch_id' => $dispatch->id]);

        Sanctum::actingAs($user);

        $response = $this->postJson(remediateUrl($project, $system));

        $response
            ->assertOk()
            ->assertJsonPath('findings_count', 1)
            ->assertJsonPath('dispatch_id', $dispatch->id)
            ->assertJsonPath('findings.0.remediations.0.title', 'Fix SQL injection');
    });

    test('returns unprocessable when system has no stacks', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(remediateUrl($project, $system))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Configure at least one technology stack on the system before remediating.');
    });

    test('remediates a specific dispatch when dispatch_id is provided', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $stack = Stack::factory()->laravel()->create();
        $system->stacks()->attach($stack->id, ['is_primary' => true]);

        Remediation::factory()->for($stack)->create([
            'attack_category' => AttackCategory::Xss,
        ]);

        $attack = Attack::factory()->for($user)->create([
            'category' => AttackCategory::Xss,
        ]);

        $olderDispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now()->subDay(),
        ]);
        $targetDispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now(),
        ]);

        SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $olderDispatch->id,
        ]);
        SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $targetDispatch->id,
        ]);

        Sanctum::actingAs($user);

        $this->postJson(remediateUrl($project, $system), [
            'dispatch_id' => $targetDispatch->id,
        ])
            ->assertOk()
            ->assertJsonPath('dispatch_id', $targetDispatch->id)
            ->assertJsonPath('findings_count', 1);
    });

    test('paginates findings when page and per_page are provided', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $stack = Stack::factory()->laravel()->create();
        $system->stacks()->attach($stack->id, ['is_primary' => true]);

        Remediation::factory()->for($stack)->create([
            'attack_category' => AttackCategory::SqlInjection,
        ]);

        $attack = Attack::factory()->for($user)->create([
            'category' => AttackCategory::SqlInjection,
        ]);
        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'scan_type' => AttackScanType::Dast,
            'completed_at' => now(),
        ]);

        foreach (range(1, 3) as $index) {
            SystemResult::factory()
                ->for($system)
                ->for($attack)
                ->create(['attack_dispatch_id' => $dispatch->id]);
        }

        Sanctum::actingAs($user);

        $this->postJson(remediateUrl($project, $system), [
            'dispatch_id' => $dispatch->id,
            'page' => 2,
            'per_page' => 1,
        ])
            ->assertOk()
            ->assertJsonPath('findings_count', 3)
            ->assertJsonCount(1, 'findings')
            ->assertJsonPath('findings_pagination.current_page', 2)
            ->assertJsonPath('findings_pagination.per_page', 1)
            ->assertJsonPath('findings_pagination.total', 3)
            ->assertJsonPath('findings_pagination.last_page', 3);
    });
});
