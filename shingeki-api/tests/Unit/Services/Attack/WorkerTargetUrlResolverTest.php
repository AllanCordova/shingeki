<?php

use App\Services\Scanning\Attack\WorkerTargetUrlResolver;

test('worker target url resolver maps lab browser url to docker service', function () {
    config([
        'attacks.vulnerable_target_url' => 'http://127.0.0.1:8090',
        'attacks.vulnerable_target_worker_url' => 'http://vulnerable-target',
    ]);

    $resolver = app(WorkerTargetUrlResolver::class);

    expect($resolver->forWorker('http://127.0.0.1:8090'))->toBe('http://vulnerable-target')
        ->and($resolver->forWorker('http://localhost:8090'))->toBe('http://vulnerable-target')
        ->and($resolver->forWorker('https://app.example.com'))->toBe('https://app.example.com');
});

test('manual proxy target url resolver keeps browser url on api host', function () {
    config([
        'attacks.vulnerable_target_url' => 'http://127.0.0.1:8090',
        'attacks.vulnerable_target_worker_url' => 'http://vulnerable-target',
    ]);

    $resolver = app(WorkerTargetUrlResolver::class);

    expect($resolver->forManualProxy('http://127.0.0.1:8090'))->toBe('http://127.0.0.1:8090')
        ->and($resolver->forManualProxy('http://vulnerable-target'))->toBe('http://127.0.0.1:8090')
        ->and($resolver->forWorker('http://127.0.0.1:8090'))->toBe('http://vulnerable-target');
});

test('worker target url resolver rewrites localhost when configured', function () {
    config([
        'attacks.vulnerable_target_url' => 'http://127.0.0.1:8090',
        'attacks.vulnerable_target_worker_url' => null,
        'attacks.target_localhost_rewrite' => 'host.docker.internal',
    ]);

    $resolver = app(WorkerTargetUrlResolver::class);

    expect($resolver->forWorker('http://localhost:3000'))->toBe('http://host.docker.internal:3000');
});
