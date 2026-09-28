<?php

use App\Services\Attack\WorkerTargetUrlResolver;

test('worker target url resolver leaves remote urls unchanged', function () {
    config([
        'attacks.target_localhost_rewrite' => 'host.docker.internal',
    ]);

    $resolver = app(WorkerTargetUrlResolver::class);

    expect($resolver->forWorker('https://app.example.com'))->toBe('https://app.example.com');
});

test('manual proxy target url resolver keeps the cadastrado url', function () {
    $resolver = app(WorkerTargetUrlResolver::class);

    expect($resolver->forManualProxy('http://127.0.0.1:3010'))->toBe('http://127.0.0.1:3010')
        ->and($resolver->forManualProxy('https://app.example.com/'))->toBe('https://app.example.com');
});

test('worker target url resolver rewrites localhost when configured', function () {
    config([
        'attacks.target_localhost_rewrite' => 'host.docker.internal',
    ]);

    $resolver = app(WorkerTargetUrlResolver::class);

    expect($resolver->forWorker('http://localhost:3000'))->toBe('http://host.docker.internal:3000');
});

test('rewrite public text maps worker origin back to the cadastrado browser url', function () {
    config([
        'attacks.target_localhost_rewrite' => 'host.docker.internal',
    ]);

    $resolver = app(WorkerTargetUrlResolver::class);
    $text = "GET http://host.docker.internal:3010/preview HTTP/1.1\nHost: host.docker.internal:3010";

    expect($resolver->rewritePublicText($text, 'http://127.0.0.1:3010'))
        ->toBe("GET http://127.0.0.1:3010/preview HTTP/1.1\nHost: 127.0.0.1:3010")
        ->and($resolver->rewritePublicText('', 'http://127.0.0.1:3010'))->toBe('')
        ->and($resolver->rewritePublicText('https://app.example.com/login', 'https://app.example.com'))
        ->toBe('https://app.example.com/login');
});

test('rewrite public text maps worker host even when api rewrite config is empty', function () {
    config([
        'attacks.target_localhost_rewrite' => null,
    ]);

    $resolver = app(WorkerTargetUrlResolver::class);

    expect($resolver->rewritePublicText('http://host.docker.internal:3010/preview', 'http://127.0.0.1:3010'))
        ->toBe('http://127.0.0.1:3010/preview');
});
