<?php

use App\Enums\UserNotificationStatus;
use App\Enums\UserNotificationType;
use App\Models\AttackDispatch;
use App\Models\CatalogImport;
use App\Models\Project;
use App\Models\Signature;
use App\Models\System;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\Attack\AttackDispatchCompletionProcessor;
use App\Services\Attack\AttackQueuePublisher;
use App\Services\CatalogImport\CatalogImportService;
use Laravel\Sanctum\Sanctum;

const NOTIFICATIONS = '/api/notifications';

describe('user notifications api', function () {
    test('requires authentication', function () {
        $this->getJson(NOTIFICATIONS)->assertUnauthorized();
    });

    test('lists notifications for authenticated user', function () {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        UserNotification::query()->create([
            'user_id' => $user->id,
            'type' => UserNotificationType::CatalogImport,
            'status' => UserNotificationStatus::Completed,
            'title' => 'Importacao concluida',
            'body' => '10 ok',
            'action_url' => '/admin/ataques',
        ]);

        $this->getJson(NOTIFICATIONS)
            ->assertOk()
            ->assertJsonCount(1, 'notifications')
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('pending_count', 0);
    });

    test('does not expose another users notifications', function () {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        Sanctum::actingAs($viewer);

        UserNotification::query()->create([
            'user_id' => $owner->id,
            'type' => UserNotificationType::CatalogImport,
            'status' => UserNotificationStatus::Completed,
            'title' => 'Privada',
            'body' => 'Nao deve aparecer',
        ]);

        $this->getJson(NOTIFICATIONS)
            ->assertOk()
            ->assertJsonCount(0, 'notifications');
    });

    test('marks notification as read', function () {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $notification = UserNotification::query()->create([
            'user_id' => $user->id,
            'type' => UserNotificationType::AttackDispatch,
            'status' => UserNotificationStatus::Completed,
            'title' => 'Scan finalizado',
            'body' => 'ok',
        ]);

        $this->patchJson(NOTIFICATIONS.'/'.$notification->id.'/read')
            ->assertOk()
            ->assertJsonPath('notification.read_at', fn ($value) => $value !== null);
    });

    test('marks all notifications as read', function () {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        UserNotification::query()->create([
            'user_id' => $user->id,
            'type' => UserNotificationType::AttackDispatch,
            'status' => UserNotificationStatus::Completed,
            'title' => 'A',
            'body' => 'a',
        ]);
        UserNotification::query()->create([
            'user_id' => $user->id,
            'type' => UserNotificationType::CatalogImport,
            'status' => UserNotificationStatus::Failed,
            'title' => 'B',
            'body' => 'b',
        ]);

        $this->postJson(NOTIFICATIONS.'/read-all')->assertOk();

        expect(UserNotification::query()->whereNull('read_at')->count())->toBe(0);
    });
});

describe('notification lifecycle integration', function () {
    test('attack dispatch creates pending notification and completion marks it done', function () {
        $admin = User::factory()->admin()->create(['email' => 'admin@admin.com']);
        \App\Models\Attack::factory()->count(2)->for($admin)->create();

        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $system = System::factory()->for($project)->create();

        Signature::factory()->for($user)->for($system)->permitted()->create([
            'token' => str_repeat('d', 64),
        ]);

        $this->mock(AttackQueuePublisher::class)->shouldReceive('publishDispatchBatch')->once();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/projects/'.$project->id.'/systems/'.$system->id.'/attacks/dispatch', [])
            ->assertAccepted();

        $dispatchId = $response->json('dispatch.id');

        $pending = UserNotification::query()->where('subject_id', $dispatchId)->first();
        expect($pending)->not->toBeNull()
            ->and($pending->status)->toBe(UserNotificationStatus::Pending);

        $dispatch = AttackDispatch::query()->findOrFail($dispatchId);

        app(AttackDispatchCompletionProcessor::class)->process([
            'event' => AttackDispatchCompletionProcessor::EVENT,
            'dispatch_id' => $dispatch->id,
            'system_id' => $system->id,
            'duration_ms' => 1500,
            'findings_count' => 2,
        ]);

        $completed = $pending->fresh();
        expect($completed->status)->toBe(UserNotificationStatus::Completed)
            ->and($completed->read_at)->toBeNull()
            ->and($completed->body)->toContain('2 finding');
    });

    test('catalog import completion updates notification', function () {
        $user = User::factory()->specialist()->create();
        $import = CatalogImport::query()->create([
            'user_id' => $user->id,
            'type' => \App\Enums\CatalogImportType::Attacks,
            'status' => \App\Enums\CatalogImportStatus::Pending,
            'total_rows' => 2,
        ]);

        app(\App\Services\Notification\UserNotificationService::class)
            ->trackCatalogImportPending($import);

        app(CatalogImportService::class)->processMessage([
            'import_id' => $import->id,
            'user_id' => $user->id,
            'items' => [],
            'chunk_index' => 0,
            'chunk_total' => 1,
        ]);

        $notification = UserNotification::query()
            ->where('subject_id', $import->id)
            ->first();

        expect($notification)->not->toBeNull()
            ->and($notification->status)->toBe(UserNotificationStatus::Completed);
    });
});
