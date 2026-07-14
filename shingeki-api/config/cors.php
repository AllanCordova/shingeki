<?php

return [

    'paths' => ['api/*', 'graphql', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter([
        env('CORS_ALLOWED_ORIGIN'),
        'http://127.0.0.1:8090',
        'http://localhost:8090',
        'http://127.0.0.1:8000',
        'http://localhost:8000',
        'http://127.0.0.1:8081',
        'http://localhost:8081',
        'http://127.0.0.1:19006',
        'http://localhost:19006',
    ])),

    'allowed_origins_patterns' => [
        '#^chrome-extension://[a-p]{32}$#',
        '#^http://localhost(:\d+)?$#',
        '#^http://127\.0\.0\.1(:\d+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
