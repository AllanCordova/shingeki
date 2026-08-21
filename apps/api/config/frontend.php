<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Frontend Application URL
    |--------------------------------------------------------------------------
    |
    | Base URL of the Shingeki web client. Used in audit reports and as the
    | default return host after Google OIDC (overridden by the browser origin
    | when it is in allowed_origins).
    |
    */

    'url' => rtrim((string) env('FRONTEND_URL', 'http://127.0.0.1:3000'), '/'),

    /*
    |--------------------------------------------------------------------------
    | Allowed frontend origins (Google OIDC return)
    |--------------------------------------------------------------------------
    |
    | localhost and 127.0.0.1 are different cookie jars. The BFF sends the
    | browser origin when starting Google login; the API only redirects back
    | to origins listed here.
    |
    */

    'allowed_origins' => array_values(array_unique(array_filter(array_map(
        static fn (string $origin): string => rtrim(trim($origin), '/'),
        array_merge(
            [
                (string) env('FRONTEND_URL', 'http://127.0.0.1:3000'),
                'http://127.0.0.1:3000',
                'http://localhost:3000',
            ],
            array_filter(explode(',', (string) env('FRONTEND_ALLOWED_ORIGINS', ''))),
        ),
    )))),

];
