<?php

use App\Support\CaptureUrlPolicy;

test('login host must be the target host or one of its subdomains', function () {
    expect(CaptureUrlPolicy::hostInScope(
        'https://demo.owasp-juice.shop',
        'https://demo.owasp-juice.shop/#/login',
    ))->toBeTrue()
        ->and(CaptureUrlPolicy::hostInScope(
            'https://app.example.com',
            'https://shop.app.example.com/login',
        ))->toBeTrue()
        ->and(CaptureUrlPolicy::hostInScope(
            'https://demo.owasp-juice.shop',
            'http://rabbitmq:15672',
        ))->toBeFalse()
        ->and(CaptureUrlPolicy::hostInScope(
            'https://app.example.com',
            'http://169.254.169.254',
        ))->toBeFalse();
});

test('metadata, link-local, and docker service names are disallowed', function () {
    expect(CaptureUrlPolicy::isDisallowedHost('169.254.169.254'))->toBeTrue()
        ->and(CaptureUrlPolicy::isDisallowedHost('metadata.google.internal'))->toBeTrue()
        ->and(CaptureUrlPolicy::isDisallowedHost('rabbitmq'))->toBeTrue()
        ->and(CaptureUrlPolicy::isDisallowedHost('host.docker.internal'))->toBeTrue()
        ->and(CaptureUrlPolicy::isDisallowedHost('demo.owasp-juice.shop'))->toBeFalse()
        ->and(CaptureUrlPolicy::isDisallowedHost('127.0.0.1'))->toBeFalse();
});
