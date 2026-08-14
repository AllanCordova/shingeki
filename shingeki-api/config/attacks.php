<?php

return [

    'catalog_admin_email' => env('ATTACKS_CATALOG_ADMIN_EMAIL', 'catalog-owner@shingeki.local'),

    'vulnerable_target_url' => env('VULNERABLE_TARGET_URL', 'http://127.0.0.1:8090'),

    // URL used in RabbitMQ batches when target_url points at the lab on localhost.
    'vulnerable_target_worker_url' => env('VULNERABLE_TARGET_WORKER_URL', 'http://vulnerable-target'),

    // Optional rewrite for other localhost targets (e.g. Next.js on :3000).
    'target_localhost_rewrite' => env('ATTACKS_TARGET_LOCALHOST_REWRITE'),

    'vulnerable_target_signature_token' => env(
        'VULNERABLE_TARGET_SIGNATURE_TOKEN',
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ),

    'queues' => [
        'dispatch' => env('RABBITMQ_ATTACKS_DISPATCH_QUEUE', 'attacks.dispatch'),
        'sast_dispatch' => env('RABBITMQ_ATTACKS_SAST_DISPATCH_QUEUE', 'attacks.sast.dispatch'),
        'results' => env('RABBITMQ_ATTACKS_RESULTS_QUEUE', 'attacks.results'),
    ],

];
