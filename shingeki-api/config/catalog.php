<?php

return [

    'import' => [
        'max_rows' => (int) env('CATALOG_IMPORT_MAX_ROWS', 200),
        'chunk_size' => (int) env('CATALOG_IMPORT_CHUNK_SIZE', 50),
    ],

    'queues' => [
        'attacks_import' => env('RABBITMQ_CATALOG_ATTACKS_IMPORT_QUEUE', 'catalog.attacks.import'),
        'remediations_import' => env('RABBITMQ_CATALOG_REMEDIATIONS_IMPORT_QUEUE', 'catalog.remediations.import'),
    ],

];
