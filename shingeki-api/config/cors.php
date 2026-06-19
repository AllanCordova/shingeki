<?php

return [

    'paths' => ['api/target-session/capture/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter([
        env('CORS_ALLOWED_ORIGIN'),
        'http://127.0.0.1:8090',
        'http://localhost:8090',
        'http://127.0.0.1:8000',
        'http://localhost:8000',
    ])),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
