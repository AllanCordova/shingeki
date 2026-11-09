<?php

use App\Support\DastRouteMap;

test('normalizes relative api paths and placeholder values', function () {
    $routes = DastRouteMap::normalize([
        ['method' => 'get', 'path' => 'api/v1/user'],
        ['path' => '/api/v1/product/{id}?extra=1', 'query' => ['id' => '42']],
    ]);

    expect($routes)->toBe([
        ['method' => 'GET', 'path' => '/api/v1/user'],
        ['method' => 'GET', 'path' => '/api/v1/product/42', 'query' => ['extra' => '1']],
    ]);
});

test('rejects paths that are not on the target', function () {
    expect(fn () => DastRouteMap::normalize([
        ['path' => 'https://evil.example/api/v1/user'],
    ]))->toThrow(InvalidArgumentException::class);

    expect(fn () => DastRouteMap::normalize([
        ['path' => '/api/../admin'],
    ]))->toThrow(InvalidArgumentException::class);
});
