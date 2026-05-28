<?php

use App\Enums\SignatureStatus;
use App\Models\Project;
use App\Models\Signature;
use App\Models\System;
use App\Models\User;
use App\Services\Signature\SignatureHtmlVerifier;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

function signaturesGenerateUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/signatures/generate';
}

function signaturesValidateUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/signatures/validate';
}

function signaturesRevokeUrl(Project $project, System $system): string
{
    return '/api/projects/'.$project->id.'/systems/'.$system->id.'/signatures/revoke';
}

describe('authentication', function () {
    test('requires authentication for signature routes', function (string $method, string $route) {
        $project = Project::factory()->create();
        $system = System::factory()->for($project)->create();

        $url = match ($route) {
            'generate' => signaturesGenerateUrl($project, $system),
            'validate' => signaturesValidateUrl($project, $system),
            'revoke' => signaturesRevokeUrl($project, $system),
        };

        $this->json($method, $url)->assertUnauthorized();
    })->with([
        'generate' => ['POST', 'generate'],
        'validate' => ['POST', 'validate'],
        'revoke' => ['POST', 'revoke'],
    ]);
});

describe('POST signatures/generate', function () {
    test('generates signature token for owned system', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $response = $this->postJson(signaturesGenerateUrl($project, $system));

        $response
            ->assertCreated()
            ->assertJson([
                'message' => 'Signature token generated successfully.',
                'installation' => [
                    'meta_name' => SignatureHtmlVerifier::META_NAME,
                ],
            ])
            ->assertJsonStructure([
                'message',
                'signature' => ['id', 'token', 'status', 'expiration'],
                'installation' => ['meta_name', 'example'],
            ]);

        expect($response->json('signature.status'))->toBe('DENIED')
            ->and($response->json('signature.token'))->toHaveLength(64);

        $this->assertDatabaseHas('signatures', [
            'user_id' => $user->id,
            'system_id' => $system->id,
            'status' => SignatureStatus::Denied->value,
        ]);
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($intruder);

        $this->postJson(signaturesGenerateUrl($project, $system))->assertNotFound();
    });
});

describe('POST signatures/validate', function () {
    test('permits signature when token is present in system html', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'target_url' => 'https://target.test',
        ]);

        Sanctum::actingAs($user);

        $generate = $this->postJson(signaturesGenerateUrl($project, $system))->assertCreated();
        $token = $generate->json('signature.token');

        Http::fake([
            'https://target.test' => Http::response(
                '<html><head><meta name="shingeki-signature" content="'.$token.'"></head></html>',
                200,
            ),
        ]);

        $this->postJson(signaturesValidateUrl($project, $system))
            ->assertOk()
            ->assertJson([
                'exists' => true,
                'found_in_html' => true,
                'permitted' => true,
                'signature' => ['status' => 'PERMITTED'],
            ])
            ->assertJsonMissing(['signature' => ['token' => $token]]);
    });

    test('returns not found when no active signature exists', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(signaturesValidateUrl($project, $system))
            ->assertNotFound()
            ->assertJson([
                'exists' => false,
                'permitted' => false,
            ]);
    });

    test('denies signature when token is not in html', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create([
            'target_url' => 'https://target.test',
        ]);

        Sanctum::actingAs($user);

        $this->postJson(signaturesGenerateUrl($project, $system))->assertCreated();

        Http::fake([
            'https://target.test' => Http::response('<html><head></head></html>', 200),
        ]);

        $this->postJson(signaturesValidateUrl($project, $system))
            ->assertOk()
            ->assertJson([
                'exists' => true,
                'found_in_html' => false,
                'permitted' => false,
                'signature' => ['status' => 'DENIED'],
            ]);
    });
});

describe('POST signatures/revoke', function () {
    test('revokes active signature', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(signaturesGenerateUrl($project, $system))->assertCreated();

        $this->postJson(signaturesRevokeUrl($project, $system))
            ->assertOk()
            ->assertJson(['message' => 'Signature token revoked successfully.']);

        expect(Signature::query()->where('user_id', $user->id)->where('system_id', $system->id)->count())->toBe(0);
    });

    test('returns not found when no active signature exists', function () {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($user);

        $this->postJson(signaturesRevokeUrl($project, $system))
            ->assertNotFound()
            ->assertJsonPath('message', 'No active signature token found for this system.');
    });

    test('returns not found for another users project', function () {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $system = System::factory()->for($project)->create();

        Sanctum::actingAs($intruder);

        $this->postJson(signaturesRevokeUrl($project, $system))->assertNotFound();
    });
});
