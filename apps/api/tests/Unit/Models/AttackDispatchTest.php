<?php

use App\Models\Attack\Attack;
use App\Models\Attack\AttackDispatch;
use App\Models\Project\Project;
use App\Models\System\System;
use App\Models\System\SystemResult;
use App\Models\User\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;

uses(RefreshDatabase::class);

function bindAttackDispatchRoute(System $system): void
{
    $request = Request::create('/fake', 'GET');
    $route = new Route('GET', '/fake', []);
    $route->bind($request);
    $route->setParameter('system', $system);
    $request->setRouteResolver(fn () => $route);

    app()->instance('request', $request);
}

test('resolveRouteBinding returns dispatch when it belongs to the route system', function () {
    $system = System::factory()->create();
    $dispatch = AttackDispatch::factory()->for($system)->create();

    bindAttackDispatchRoute($system);

    $resolved = (new AttackDispatch)->resolveRouteBinding($dispatch->id);

    expect($resolved)->not->toBeNull()
        ->and($resolved->is($dispatch))->toBeTrue();
});

test('resolveRouteBinding returns null when dispatch belongs to another system', function () {
    $system = System::factory()->create();
    $otherSystem = System::factory()->create();
    $dispatch = AttackDispatch::factory()->for($otherSystem)->create();

    bindAttackDispatchRoute($system);

    $resolved = (new AttackDispatch)->resolveRouteBinding($dispatch->id);

    expect($resolved)->toBeNull();
});

test('resolveRouteBinding returns null when route system parameter is missing', function () {
    $dispatch = AttackDispatch::factory()->create();

    app()->instance('request', Request::create('/fake', 'GET'));

    $resolved = (new AttackDispatch)->resolveRouteBinding($dispatch->id);

    expect($resolved)->toBeNull();
});

test('resolveRouteBinding returns null when route system parameter is not a system model', function () {
    $dispatch = AttackDispatch::factory()->create();

    $request = Request::create('/fake', 'GET');
    $route = new Route('GET', '/fake', []);
    $route->bind($request);
    $route->setParameter('system', 'not-a-system');
    $request->setRouteResolver(fn () => $route);

    app()->instance('request', $request);

    $resolved = (new AttackDispatch)->resolveRouteBinding($dispatch->id);

    expect($resolved)->toBeNull();
});

test('resolveRouteBinding returns null when dispatch id does not exist', function () {
    $system = System::factory()->create();

    bindAttackDispatchRoute($system);

    $resolved = (new AttackDispatch)->resolveRouteBinding('019e7121-0000-7000-8000-000000000000');

    expect($resolved)->toBeNull();
});

test('resolveRouteBinding can resolve using a custom field', function () {
    $system = System::factory()->create();
    $dispatch = AttackDispatch::factory()->for($system)->create();

    bindAttackDispatchRoute($system);

    $resolved = (new AttackDispatch)->resolveRouteBinding($dispatch->id, 'id');

    expect($resolved)->not->toBeNull()
        ->and($resolved->is($dispatch))->toBeTrue();
});

test('belongs to user and system', function () {
    $user = User::factory()->create();
    $project = Project::factory()->for($user)->create();
    $system = System::factory()->for($project)->create();
    $dispatch = AttackDispatch::factory()->for($system)->for($user)->create();

    expect($dispatch->user->is($user))->toBeTrue()
        ->and($dispatch->system->is($system))->toBeTrue();
});

test('has many system results', function () {
    $system = System::factory()->create();
    $attack = Attack::factory()->create();
    $dispatch = AttackDispatch::factory()->for($system)->create();

    $results = SystemResult::factory()
        ->count(2)
        ->for($system)
        ->for($attack)
        ->create(['attack_dispatch_id' => $dispatch->id]);

    expect($dispatch->systemResults)->toHaveCount(2)
        ->and($dispatch->systemResults->pluck('id')->all())
        ->toEqual($results->pluck('id')->all());
});

test('casts datetime and integer attributes', function () {
    $dispatchedAt = now()->subMinute()->startOfSecond();
    $completedAt = now()->startOfSecond();

    $dispatch = AttackDispatch::factory()->create([
        'dispatched_at' => $dispatchedAt,
        'completed_at' => $completedAt,
        'duration_ms' => '4500',
        'findings_count' => '3',
    ])->fresh();

    expect($dispatch->dispatched_at->equalTo($dispatchedAt))->toBeTrue()
        ->and($dispatch->completed_at->equalTo($completedAt))->toBeTrue()
        ->and($dispatch->duration_ms)->toBeInt()->toBe(4500)
        ->and($dispatch->findings_count)->toBeInt()->toBe(3);
});
