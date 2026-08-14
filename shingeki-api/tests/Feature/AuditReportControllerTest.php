<?php

use App\Models\Catalog\Attack;
use App\Models\Identity\User;
use App\Models\Scanning\AttackDispatch;
use App\Models\Scanning\DispatchProbe;
use App\Models\Scanning\SystemResult;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use Laravel\Sanctum\Sanctum;

function auditReportExportUrl(Project $project, System $system, AttackDispatch $dispatch): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/system-results/'.$dispatch->id.'/export';
}

describe('GET system-results/{attack_dispatch}/export', function () {
    test('requires authentication', function () {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();
        $dispatch = AttackDispatch::factory()->for($system)->create([
            'completed_at' => now(),
        ]);

        $this->get(auditReportExportUrl($project, $system, $dispatch))
            ->assertUnauthorized();
    });

    test('exports completed dispatch as pdf', function () {
        $user = User::factory()->create(['name' => 'Auditor User']);
        $project = Project::factory()->for($user)->create(['name' => 'Projeto Alpha']);
        $system = System::factory()->for($project)->create([
            'name' => 'API Gateway',
            'target_url' => 'https://example.com',
        ]);
        $attack = Attack::factory()->create();

        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => now(),
            'duration_ms' => 95000,
            'findings_count' => 1,
            'probes_count' => 5,
        ]);

        SystemResult::factory()->for($system)->for($attack)->create([
            'attack_dispatch_id' => $dispatch->id,
            'evidence' => 'SQL error signature detected in response body',
            'vulnerable_route' => '/api/users',
        ]);

        DispatchProbe::factory()->for($dispatch)->for($system)->for($attack)->count(5)->create();

        Sanctum::actingAs($user);

        $response = $this->get(auditReportExportUrl($project, $system, $dispatch));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        expect($response->headers->get('content-disposition'))->toContain('attachment');
        expect($response->headers->get('content-disposition'))->toContain('.pdf');
        expect(strlen($response->getContent()))->toBeGreaterThan(100);
    });

    test('rejects export for pending dispatch', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();
        $dispatch = AttackDispatch::factory()->for($system)->for($user)->create([
            'completed_at' => null,
        ]);

        Sanctum::actingAs($user);

        $this->getJson(auditReportExportUrl($project, $system, $dispatch))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'O relatório só pode ser exportado após a conclusão do disparo.');
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $system = System::factory()->for($project)->create();
        $dispatch = AttackDispatch::factory()->for($system)->for($owner)->create([
            'completed_at' => now(),
        ]);

        Sanctum::actingAs($intruder);

        $this->get(auditReportExportUrl($project, $system, $dispatch))
            ->assertNotFound();
    });
});
