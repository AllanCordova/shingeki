<?php

use App\Models\Project;
use App\Models\Signature;
use App\Models\System;
use App\Models\User;
use Database\Seeders\VulnerableTargetSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('vulnerable target seeder creates lab project system and permitted signature', function () {
    config([
        'attacks.vulnerable_target_url' => 'http://vulnerable-target',
        'attacks.vulnerable_target_signature_token' => str_repeat('b', 64),
    ]);

    User::factory()->create(['email' => 'test@example.com']);

    $this->seed(VulnerableTargetSeeder::class);

    $user = User::query()->where('email', 'test@example.com')->firstOrFail();

    $project = Project::query()
        ->where('user_id', $user->id)
        ->where('name', VulnerableTargetSeeder::PROJECT_NAME)
        ->first();

    expect($project)->not->toBeNull();

    $system = System::query()
        ->where('project_id', $project->id)
        ->where('name', VulnerableTargetSeeder::SYSTEM_NAME)
        ->first();

    expect($system)->not->toBeNull()
        ->and($system->target_url)->toBe('http://vulnerable-target');

    $signature = Signature::query()
        ->where('user_id', $user->id)
        ->where('system_id', $system->id)
        ->first();

    expect($signature)->not->toBeNull()
        ->and($signature->token)->toBe(str_repeat('b', 64))
        ->and($signature->status->value)->toBe('PERMITTED');
});
