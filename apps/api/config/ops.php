<?php

return [
    'rabbitmq_mgmt_url' => env('RABBITMQ_MGMT_URL', 'http://127.0.0.1:15672'),
    'rabbitmq_user' => env('RABBITMQ_USER', 'guest'),
    'rabbitmq_password' => env('RABBITMQ_PASSWORD', 'guest'),
    'rabbitmq_vhost' => env('RABBITMQ_VHOST', '/'),
    'queues' => [
        env('RABBITMQ_ATTACKS_DISPATCH_QUEUE', 'attacks.dispatch'),
        env('RABBITMQ_ATTACKS_SAST_DISPATCH_QUEUE', 'attacks.sast.dispatch'),
        env('RABBITMQ_ATTACKS_RESULTS_QUEUE', 'attacks.results'),
        env('RABBITMQ_CATALOG_ATTACKS_IMPORT_QUEUE', 'catalog.attacks.import'),
        env('RABBITMQ_CATALOG_REMEDIATIONS_IMPORT_QUEUE', 'catalog.remediations.import'),
    ],
    // These queues are drained with basic.get in a loop, so RabbitMQ reports
    // zero consumers even while the poller is healthy.
    'polled_queues' => [
        env('RABBITMQ_ATTACKS_RESULTS_QUEUE', 'attacks.results'),
        env('RABBITMQ_CATALOG_ATTACKS_IMPORT_QUEUE', 'catalog.attacks.import'),
        env('RABBITMQ_CATALOG_REMEDIATIONS_IMPORT_QUEUE', 'catalog.remediations.import'),
    ],
];
