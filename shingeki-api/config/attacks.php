<?php

return [

    'catalog_admin_email' => env('ATTACKS_CATALOG_ADMIN_EMAIL', 'admin@admin.com'),

    'vulnerable_target_url' => env('VULNERABLE_TARGET_URL', 'http://vulnerable-target'),

    'vulnerable_target_signature_token' => env(
        'VULNERABLE_TARGET_SIGNATURE_TOKEN',
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ),

    'queues' => [
        'dispatch' => env('RABBITMQ_ATTACKS_DISPATCH_QUEUE', 'attacks.dispatch'),
        'results' => env('RABBITMQ_ATTACKS_RESULTS_QUEUE', 'attacks.results'),
    ],

];
