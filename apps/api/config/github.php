<?php

return [

    'token' => env('GITHUB_TOKEN'),

    'api_base_url' => rtrim((string) env('GITHUB_API_BASE_URL', 'https://api.github.com'), '/'),

    'default_branch' => env('GITHUB_DEFAULT_BRANCH', env('AI_SOURCE_DEFAULT_BRANCH', 'main')),

    // Prefix when SAST scans a subfolder locally but GitHub repo nests code (e.g. labs/vulnerable-target).
    'repository_source_prefix' => env('GITHUB_REPOSITORY_SOURCE_PREFIX', ''),

    'branch_prefix' => env('GITHUB_REMEDIATION_BRANCH_PREFIX', 'fix-security'),

    'timeout_seconds' => (int) env('GITHUB_API_TIMEOUT', 30),

];
