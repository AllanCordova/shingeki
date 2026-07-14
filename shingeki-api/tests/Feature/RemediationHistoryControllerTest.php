<?php

use App\Enums\AttackScanType;
use App\Enums\RemediationRunType;
use App\Models\AiRemediationSuggestion;
use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\RemediationRun;
use App\Models\Stack;
use App\Models\System;
use App\Models\SystemResult;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function remediationHistoryUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/remediation-history';
}

describe('GET systems/remediation-history', function () {
    test('returns one ai event per run instead of per suggestion', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'scan_type' => AttackScanType::Sast,
            'completed_at' => now()->subHour(),
            'findings_count' => 3,
        ]);

        $results = SystemResult::factory()
            ->for($system)
            ->count(3)
            ->create(['attack_dispatch_id' => $dispatch->id]);

        foreach ($results as $result) {
            AiRemediationSuggestion::factory()->create([
                'system_result_id' => $result->id,
                'attack_dispatch_id' => $dispatch->id,
                'created_at' => now(),
            ]);
        }

        RemediationRun::factory()->ai()->create([
            'system_id' => $system->id,
            'attack_dispatch_id' => $dispatch->id,
            'user_id' => $user->id,
            'findings_count' => 3,
            'created_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson(remediationHistoryUrl($project, $system).'?per_page=30');

        $response->assertOk();

        $aiEvents = collect($response->json('events'))
            ->where('type', RemediationRunType::AiSuggestion->value)
            ->values();

        expect($aiEvents)->toHaveCount(1)
            ->and($aiEvents->first()['findings_count'])->toBe(3)
            ->and($response->json('pagination.total'))->toBeGreaterThanOrEqual(2);
    });

    test('filters by date range and paginates', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now()->subDays(10),
            'findings_count' => 1,
        ]);
        AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now()->subDay(),
            'findings_count' => 2,
        ]);

        RemediationRun::factory()->create([
            'system_id' => $system->id,
            'user_id' => $user->id,
            'type' => RemediationRunType::CatalogSuggestion,
            'findings_count' => 2,
            'created_at' => now()->subDay(),
        ]);

        Sanctum::actingAs($user);

        $from = now()->subDays(2)->toDateString();
        $to = now()->toDateString();

        $response = $this->getJson(
            remediationHistoryUrl($project, $system)."?from={$from}&to={$to}&per_page=5&page=1",
        );

        $response
            ->assertOk()
            ->assertJsonPath('pagination.per_page', 5);

        $types = collect($response->json('events'))->pluck('type');

        expect($types)->toContain('scan_completed')
            ->and($types)->toContain('catalog_suggestion')
            ->and($response->json('pagination.total'))->toBe(2);
    });

    test('filters by event type attack and catalog', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now()->subHour(),
            'findings_count' => 0,
        ]);
        RemediationRun::factory()->create([
            'system_id' => $system->id,
            'user_id' => $user->id,
            'type' => RemediationRunType::CatalogSuggestion,
            'findings_count' => 1,
            'created_at' => now(),
        ]);
        RemediationRun::factory()->ai()->create([
            'system_id' => $system->id,
            'user_id' => $user->id,
            'findings_count' => 2,
            'created_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $attackResponse = $this->getJson(
            remediationHistoryUrl($project, $system).'?type=attack&per_page=30',
        );
        $attackResponse->assertOk();
        expect(collect($attackResponse->json('events'))->pluck('type')->unique()->values()->all())
            ->toBe(['scan_clean']);

        $catalogResponse = $this->getJson(
            remediationHistoryUrl($project, $system).'?type=catalog_suggestion&per_page=30',
        );
        $catalogResponse->assertOk();
        expect(collect($catalogResponse->json('events'))->pluck('type')->all())
            ->toBe(['catalog_suggestion']);

        $aiResponse = $this->getJson(
            remediationHistoryUrl($project, $system).'?type=ai_suggestion&per_page=30',
        );
        $aiResponse->assertOk();
        expect(collect($aiResponse->json('events'))->pluck('type')->all())
            ->toBe(['ai_suggestion']);
    });
});

describe('POST systems/remediate history', function () {
    test('records a catalog run on first page only', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $stack = Stack::factory()->laravel()->create();
        $system->stacks()->attach($stack->id, ['is_primary' => true]);

        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now(),
            'findings_count' => 1,
        ]);
        SystemResult::factory()->for($system)->create([
            'attack_dispatch_id' => $dispatch->id,
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/projects/'.$project->id.'/systems/'.$system->id.'/remediate', [
            'page' => 1,
            'per_page' => 25,
        ])->assertOk();

        $this->postJson('/api/projects/'.$project->id.'/systems/'.$system->id.'/remediate', [
            'page' => 2,
            'per_page' => 25,
        ])->assertOk();

        expect(
            RemediationRun::query()
                ->where('system_id', $system->id)
                ->where('type', RemediationRunType::CatalogSuggestion)
                ->count()
        )->toBe(1);
    });
});
