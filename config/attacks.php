<?php

return [

    'catalog_admin_email' => env('ATTACKS_CATALOG_ADMIN_EMAIL', 'admin@admin.com'),

    'queues' => [
        'dispatch' => env('RABBITMQ_ATTACKS_DISPATCH_QUEUE', 'attacks.dispatch'),
        'results' => env('RABBITMQ_ATTACKS_RESULTS_QUEUE', 'attacks.results'),
    ],

];
