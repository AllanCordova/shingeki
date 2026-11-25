<?php

use App\Models\User\User;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

test('admin can read ops status with capture health and queues', function () {
    config([
        'browser_state.capture_service_url' => 'http://capture.test',
        'ops.rabbitmq_mgmt_url' => 'http://rabbitmq-mgmt.test',
        'ops.rabbitmq_user' => 'guest',
        'ops.rabbitmq_password' => 'guest',
        'ops.rabbitmq_vhost' => '/',
        'ops.queues' => ['attacks.dispatch', 'attacks.results'],
    ]);

    Http::fake([
        'http://capture.test/health' => Http::response([
            'ok' => true,
            'busy' => false,
            'active_capture_id' => null,
        ], 200),
        'http://rabbitmq-mgmt.test/api/queues/*' => Http::response([
            'messages' => 0,
            'consumers' => 2,
        ], 200),
    ]);

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/ops/status')
        ->assertOk()
        ->assertJsonPath('capture.status', 'ok')
        ->assertJsonPath('capture.busy', false)
        ->assertJsonPath('queues.0.name', 'attacks.dispatch')
        ->assertJsonPath('queues.0.status', 'ok')
        ->assertJsonStructure([
            'usage' => ['last_24h', 'last_7d'],
            'in_flight' => ['count', 'items'],
        ]);
});

test('polled queues stay healthy while empty and push queues do not', function () {
    config([
        'browser_state.capture_service_url' => 'http://capture.test',
        'ops.rabbitmq_mgmt_url' => 'http://rabbitmq-mgmt.test',
        'ops.rabbitmq_user' => 'guest',
        'ops.rabbitmq_password' => 'guest',
        'ops.rabbitmq_vhost' => '/',
        'ops.queues' => ['attacks.dispatch', 'attacks.results', 'catalog.attacks.import'],
        'ops.polled_queues' => ['attacks.results', 'catalog.attacks.import'],
    ]);

    Http::fake(function ($request) {
        $url = $request->url();

        if (str_contains($url, 'attacks.dispatch')) {
            return Http::response(['messages' => 0, 'consumers' => 0], 200);
        }

        if (str_contains($url, 'catalog.attacks.import')) {
            return Http::response(['messages' => 4, 'consumers' => 0], 200);
        }

        return Http::response(['messages' => 0, 'consumers' => 0], 200);
    });

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/admin/ops/status')
        ->assertOk()
        ->assertJsonPath('queues.0.status', 'degraded')
        ->assertJsonPath('queues.0.message', 'Sem consumers conectados.')
        ->assertJsonPath('queues.1.status', 'ok')
        ->assertJsonPath('queues.1.message', 'Fila vazia. O consumer consulta em intervalos.')
        ->assertJsonPath('queues.2.status', 'degraded')
        ->assertJsonPath('queues.2.message', 'Mensagens paradas sem consumer.');
});

test('non-admin cannot read ops status', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/admin/ops/status')->assertForbidden();
});
