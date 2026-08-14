<?php

use App\Enums\Identity\UserRole;
use App\Models\Identity\User;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

describe('role policy matrix', function () {
    test('USER cannot access catalog or manual proxy', function () {
        $user = User::factory()->create(['role' => UserRole::User]);
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'target_url' => 'https://target.test',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/catalog/attacks')->assertForbidden();
        $this->postJson('/api/projects/'.$project->id.'/systems/'.$system->id.'/manual-proxy/send', [
            'method' => 'GET',
            'path' => '/',
        ])->assertForbidden();
    });

    test('SPECIALIST can access catalog and manual proxy on owned systems', function () {
        Http::fake([
            'https://target.test/*' => Http::response('ok', 200),
        ]);
        $user = User::factory()->specialist()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'target_url' => 'https://target.test',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/catalog/attacks')->assertOk();
        $this->postJson('/api/projects/'.$project->id.'/systems/'.$system->id.'/manual-proxy/send', [
            'method' => 'GET',
            'path' => '/',
        ])->assertOk();
    });

    test('ADMIN can access catalog and import endpoints', function () {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/catalog/attacks')->assertOk();
        $this->getJson('/api/catalog/attacks/import/template')->assertOk();
    });
});
