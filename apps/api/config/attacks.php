<?php

return [

    'catalog_admin_email' => env('ATTACKS_CATALOG_ADMIN_EMAIL', 'admin@admin.com'),

    // Rewrite 127.0.0.1 / localhost when the DAST worker runs in Docker.
    'target_localhost_rewrite' => env('ATTACKS_TARGET_LOCALHOST_REWRITE'),

    'queues' => [
        'dispatch' => env('RABBITMQ_ATTACKS_DISPATCH_QUEUE', 'attacks.dispatch'),
        'sast_dispatch' => env('RABBITMQ_ATTACKS_SAST_DISPATCH_QUEUE', 'attacks.sast.dispatch'),
        'results' => env('RABBITMQ_ATTACKS_RESULTS_QUEUE', 'attacks.results'),
    ],

];
