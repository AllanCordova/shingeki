<?php

return [
    'key' => env('BROWSER_STATE_KEY'),
    'ttl_minutes' => (int) env('BROWSER_CAPTURE_TTL_MINUTES', 15),
    'capture_service_url' => env('CAPTURE_SERVICE_URL'),
    'capture_service_token' => env('CAPTURE_SERVICE_TOKEN'),
    'novnc_public_url' => env('CAPTURE_NOVNC_PUBLIC_URL'),
    // Base the capture container uses to POST the session back. Empty keeps APP_URL.
    'complete_base_url' => env('CAPTURE_COMPLETE_BASE_URL'),
];
