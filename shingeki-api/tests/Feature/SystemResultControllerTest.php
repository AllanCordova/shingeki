<?php

use App\Models\Attack;
use App\Models\AttackDispatch;
use App\Models\Project;
use App\Models\System;
use App\Models\SystemResult;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function systemResultsUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/system-results';
}

function systemResultShowUrl(Project $project, System $system, AttackDispatch $dispatch): string
{
    return systemResultsUrl($project, $system).'/'.$dispatch->id;
}

describe('GET system-results', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $this->getJson(systemResultsUrl($project, $system))
            ->assertUnauthorized();
    });

    test('lists all dispatches for a system', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        $older = AttackDispatch::factory()->for($system)->for($user)->create([
            'dispatched_at' => now()->subHour(),
            'completed_at' => now()->subHour(),
            'duration_ms' => 1200,
            'findings_count' => 1,
        ]);

        $latest = AttackDispatch::factory()->for($system)->for($user)->create([
            'dispatched_at' => now(),
            'completed_at' => now(),
            'duration_ms' => 3400,
            'findings_count' => 0,
        ]);

        Sanctum::actingAs($user);

        $this->getJson(systemResultsUrl($project, $system))
            ->assertOk()
            ->assertJsonCount(2, 'dispatches')
            ->assertJsonPath('dispatches.0.id', $latest->id)
            ->assertJsonPath('dispatches.1.id', $older->id)
            ->assertJsonPath('dispatches.0.duration_ms', 3400)
            ->assertJsonPath('dispatches.0.status', 'completed');
    });

    test('returns empty list when system has no dispatches', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->getJson(systemResultsUrl($project, $system))
            ->assertOk()
            ->assertJsonPath('dispatches', []);
    });
});

describe('GET system-results/{attack_dispatch}', function () {
    test('returns dispatch with all findings', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $attack = Attack::factory()->create();

        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now(),
            'duration_ms' => 5000,
            'findings_count' => 1,
        ]);

        SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
            'evidence' => 'SQL error signature detected in response body',
        ]);

        Sanctum::actingAs($user);

        $this->getJson(systemResultShowUrl($project, $system, $dispatch))
            ->assertOk()
            ->assertJsonPath('dispatch.id', $dispatch->id)
            ->assertJsonPath('dispatch.duration_ms', 5000)
            ->assertJsonCount(1, 'results');
    });

    test('returns pending dispatch with empty results', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => null,
            'duration_ms' => null,
            'findings_count' => 0,
        ]);

        Sanctum::actingAs($user);

        $this->getJson(systemResultShowUrl($project, $system, $dispatch))
            ->assertOk()
            ->assertJsonPath('dispatch.status', 'pending')
            ->assertJsonCount(0, 'results');
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $system = System::factory()->for($project)->create();
        $dispatch = AttackDispatch::factory()->for($system)->for($owner)->create();

        Sanctum::actingAs($intruder);

        $this->getJson(systemResultShowUrl($project, $system, $dispatch))
            ->assertNotFound();
    });
});

describe('DELETE system-results/{attack_dispatch}', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();
        $dispatch = AttackDispatch::factory()->for($system)->create();

        $this->deleteJson(systemResultShowUrl($project, $system, $dispatch))
            ->assertUnauthorized();
    });

    test('deletes dispatch and its findings', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $attack = Attack::factory()->create();

        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now(),
            'findings_count' => 1,
        ]);

        SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
        ]);

        Sanctum::actingAs($user);

        $this->deleteJson(systemResultShowUrl($project, $system, $dispatch))
            ->assertOk()
            ->assertJsonPath('message', 'Attack dispatch deleted successfully.');

        $this->assertDatabaseMissing('attack_dispatches', ['id' => $dispatch->id]);
        $this->assertDatabaseMissing('system_results', [
            'attack_dispatch_id' => $dispatch->id,
        ]);
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $system = System::factory()->for($project)->create();
        $dispatch = AttackDispatch::factory()->for($system)->for($owner)->create();

        Sanctum::actingAs($intruder);

        $this->deleteJson(systemResultShowUrl($project, $system, $dispatch))
            ->assertNotFound();
    });
});

describe('DELETE system-results', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $this->deleteJson(systemResultsUrl($project, $system))
            ->assertUnauthorized();
    });

    test('deletes all dispatches and findings for a system', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $attack = Attack::factory()->create();

        $first = AttackDispatch::factory()->for($system)->for($user)->create();
        $second = AttackDispatch::factory()->for($system)->for($user)->create();

        SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $first->id,
        ]);
        SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $second->id,
        ]);

        Sanctum::actingAs($user);

        $this->deleteJson(systemResultsUrl($project, $system))
            ->assertOk()
            ->assertJsonPath('message', 'All attack dispatches deleted successfully.');

        $this->assertDatabaseMissing('attack_dispatches', ['system_id' => $system->id]);
        $this->assertDatabaseMissing('system_results', ['system_id' => $system->id]);
    });

    test('succeeds when system has no dispatches', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->deleteJson(systemResultsUrl($project, $system))
            ->assertOk()
            ->assertJsonPath('message', 'All attack dispatches deleted successfully.');
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($intruder);

        $this->deleteJson(systemResultsUrl($project, $system))
            ->assertNotFound();
    });
});
