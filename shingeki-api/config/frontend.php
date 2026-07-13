<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Frontend Application URL
    |--------------------------------------------------------------------------
    |
    | Base URL of the Shingeki web client. Used in audit reports to link back
    | to dispatch detail pages for full coverage logs.
    |
    */

    'url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/'),

];
