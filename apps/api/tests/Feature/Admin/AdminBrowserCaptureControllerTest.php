<?php

use App\Models\Attack\BrowserCaptureEvent;
use App\Models\Attack\BrowserCaptureSession;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\User\User;
use App\Support\AttackAcknowledgmentTerms;
use Laravel\Sanctum\Sanctum;

test('admin can list browser captures and export csv', function () {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->create(['email' => 'analyst@example.com']);
    $project = Project::factory()->for($user)->create(['name' => 'Lab']);
    $system = System::factory()->for($project)->create(['name' => 'Juice']);

    $capture = BrowserCaptureSession::query()->create([
        'system_id' => $system->id,
        'user_id' => $user->id,
        'token_hash' => hash('sha256', str_repeat('a', 64)),
        'expires_at' => now()->addMinutes(15),
        'depth' => 'quick',
        'terms_version' => AttackAcknowledgmentTerms::VERSION,
        'ip_address' => '203.0.113.10',
        'user_agent' => 'TestAgent',
        'browser_opened_at' => now(),
        'browser_opened_ip' => '203.0.113.10',
        'source' => 'remote_browser',
    ]);

    BrowserCaptureEvent::query()->create([
        'browser_capture_session_id' => $capture->id,
        'user_id' => $user->id,
        'event' => 'created',
        'ip_address' => '203.0.113.10',
        'created_at' => now(),
    ]);
    BrowserCaptureEvent::query()->create([
        'browser_capture_session_id' => $capture->id,
        'user_id' => $user->id,
        'event' => 'navigated',
        'url' => 'https://evil.example/phish',
        'created_at' => now(),
    ]);

    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/browser-captures')
        ->assertOk()
        ->assertJsonPath('captures.0.id', $capture->id)
        ->assertJsonPath('captures.0.user.email', 'analyst@example.com')
        ->assertJsonPath('captures.0.navigated_count', 1);

    $this->getJson('/api/admin/browser-captures/'.$capture->id)
        ->assertOk()
        ->assertJsonPath('capture.events.1.url', 'https://evil.example/phish');

    $csv = $this->get('/api/admin/browser-captures/export');
    $csv->assertOk();
    expect($csv->headers->get('content-type'))->toContain('text/csv')
        ->and($csv->streamedContent())->toContain('analyst@example.com')
        ->and($csv->streamedContent())->toContain('https://evil.example/phish');
});

test('non-admin cannot access browser capture admin endpoints', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/admin/browser-captures')->assertForbidden();
});
