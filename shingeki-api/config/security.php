<?php

return [

    'ssrf' => [
        'allow_private_networks' => (bool) env('SSRF_ALLOW_PRIVATE_NETWORKS', false),
        'resolve_dns' => (bool) env('SSRF_RESOLVE_DNS', true),
        'allowed_schemes' => ['http', 'https'],
        'allowed_ports' => array_values(array_filter(array_map(
            'intval',
            explode(',', (string) env('SSRF_ALLOWED_PORTS', '80,443')),
        ))),
        'max_redirects' => 3,
    ],

    'queue' => [
        'max_attempts' => (int) env('QUEUE_CONSUMER_MAX_ATTEMPTS', 5),
        'backoff_seconds' => (int) env('QUEUE_CONSUMER_BACKOFF_SECONDS', 5),
        'max_string_bytes' => (int) env('QUEUE_MAX_STRING_BYTES', 16384),
    ],

    'auth' => [
        'max_active_tokens' => (int) env('AUTH_MAX_ACTIVE_TOKENS', 5),
    ],

];
