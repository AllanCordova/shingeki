<?php

return [

    'token' => env('GITHUB_TOKEN'),

    'api_base_url' => rtrim((string) env('GITHUB_API_BASE_URL', 'https://api.github.com'), '/'),

    'default_branch' => env('GITHUB_DEFAULT_BRANCH', env('AI_SOURCE_DEFAULT_BRANCH', 'main')),

    // Prefix when SAST scans a subfolder locally but GitHub repo nests code (e.g. shingeki-vulnerable-target).
    'repository_source_prefix' => env('GITHUB_REPOSITORY_SOURCE_PREFIX', ''),

    'branch_prefix' => env('GITHUB_REMEDIATION_BRANCH_PREFIX', 'fix-security'),

    'timeout_seconds' => (int) env('GITHUB_API_TIMEOUT', 30),

    'allowed_hosts' => ['github.com', 'www.github.com'],

    'allowed_repositories' => array_values(array_filter(array_map(
        static fn (string $value): string => strtolower(trim($value)),
        explode(',', (string) env('GITHUB_ALLOWED_REPOSITORIES', '')),
    ))),

    'require_repository_allowlist' => filter_var(
        env('GITHUB_REQUIRE_REPOSITORY_ALLOWLIST', env('APP_ENV') === 'production'),
        FILTER_VALIDATE_BOOL,
    ),

    'app_id' => env('GITHUB_APP_ID'),

    'installation_id' => env('GITHUB_INSTALLATION_ID'),

    'private_key' => env('GITHUB_APP_PRIVATE_KEY'),

];
