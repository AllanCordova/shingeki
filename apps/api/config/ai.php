<?php

return [

    'provider' => env('AI_PROVIDER', 'gemini'),

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.0-flash'),
        'base_url' => 'https://generativelanguage.googleapis.com/v1beta',
    ],

    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
        'model' => env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
        'base_url' => 'https://api.groq.com/openai/v1',
    ],

    'temperature' => (float) env('AI_TEMPERATURE', 0.15),

    'max_findings_per_request' => (int) env('AI_MAX_FINDINGS_PER_REQUEST', 5),

    'source_context' => [
        'line_window' => (int) env('AI_SOURCE_LINE_WINDOW', 40),
        'cache_ttl_seconds' => (int) env('AI_SOURCE_CACHE_TTL', 3600),
        'default_branch' => env('AI_SOURCE_DEFAULT_BRANCH', 'main'),
    ],

];
