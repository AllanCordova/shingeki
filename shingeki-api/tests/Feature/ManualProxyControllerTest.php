<?php

use App\Models\Identity\User;
use App\Models\TargetAccess\ManualRouteMap;
use App\Models\Workspace\Project;
use App\Models\Workspace\System;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

function manualProxyUrl(Project $project, System $system, string $suffix = ''): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/manual-proxy'.$suffix;
}

describe('manual proxy', function () {
    test('regular user cannot send manual proxy requests', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'target_url' => 'https://target.test',
        ]);

        Sanctum::actingAs($user);

        $this->postJson(manualProxyUrl($project, $system, '/send'), [
            'method' => 'GET',
            'path' => '/',
        ])->assertForbidden();
    });

    test('specialist can send a proxied request to the system target', function () {
        Http::fake([
            'https://target.test/search*' => Http::response('<html>ok</html>', 200, ['X-Test' => '1']),
        ]);

        $user = User::factory()->specialist()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'target_url' => 'https://target.test',
        ]);

        Sanctum::actingAs($user);

        $this->postJson(manualProxyUrl($project, $system, '/send'), [
            'method' => 'GET',
            'path' => '/search',
            'query' => ['q' => 'abc'],
            'payload' => [
                'target_location' => 'QUERY_PARAMETER',
                'field' => 'q',
                'value' => "' OR 1=1--",
            ],
            'use_target_session' => false,
        ])
            ->assertOk()
            ->assertJsonPath('status_code', 200)
            ->assertJsonPath('method', 'GET')
            ->assertJsonPath('url', 'https://target.test/search?q=%27+OR+1%3D1--');
    });

    test('admin can manage route maps for owned systems', function () {
        $user = User::factory()->admin()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'target_url' => 'https://target.test',
        ]);

        Sanctum::actingAs($user);

        $create = $this->postJson(manualProxyUrl($project, $system, '/routes'), [
            'name' => 'Search page',
            'method' => 'GET',
            'path' => '/search',
            'query' => ['q' => 'test'],
        ]);

        $create
            ->assertCreated()
            ->assertJsonPath('route.name', 'Search page');

        $routeId = $create->json('route.id');

        $this->getJson(manualProxyUrl($project, $system, '/routes'))
            ->assertOk()
            ->assertJsonCount(1, 'routes');

        $this->putJson(manualProxyUrl($project, $system, '/routes/'.$routeId), [
            'name' => 'Search updated',
            'method' => 'POST',
            'path' => '/search',
        ])->assertOk()->assertJsonPath('route.method', 'POST');

        $this->deleteJson(manualProxyUrl($project, $system, '/routes/'.$routeId))
            ->assertOk();

        expect(ManualRouteMap::query()->count())->toBe(0);
    });

    test('rejects absolute URLs in path', function () {
        $user = User::factory()->specialist()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'target_url' => 'https://target.test',
        ]);

        Sanctum::actingAs($user);

        $this->postJson(manualProxyUrl($project, $system, '/send'), [
            'method' => 'GET',
            'path' => 'https://evil.test/',
        ])->assertUnprocessable();
    });

    test('stores empty query and headers as json objects', function () {
        $user = User::factory()->specialist()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'target_url' => 'https://target.test',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson(manualProxyUrl($project, $system, '/routes'), [
            'name' => 'Login',
            'method' => 'POST',
            'path' => '/login.php',
            'query' => (object) [],
            'headers' => (object) [],
        ])
            ->assertCreated();

        $payload = json_decode($response->getContent(), false);
        expect($payload->route->query)->toBeInstanceOf(stdClass::class)
            ->and($payload->route->headers)->toBeInstanceOf(stdClass::class);
    });
});
