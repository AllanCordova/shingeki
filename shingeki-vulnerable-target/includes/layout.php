<?php

declare(strict_types=1);

require_once __DIR__.'/auth.php';

function renderHeader(string $title): void
{
    $token = getenv('SHINGEKI_SIGNATURE_TOKEN') ?: '';
    $meta = $token !== ''
        ? '<meta name="shingeki-signature" content="'.htmlspecialchars($token, ENT_QUOTES).'">'
        : '';

    $authLinks = isAuthenticated()
        ? <<<'HTML'
        <a href="/dashboard.php">Dashboard</a>
        <a href="/profile.php">Profile</a>
        <a href="/notes.php">Notes</a>
        <a href="/app/browse/welcome.txt">Secure files</a>
        <a href="/logout.php">Logout</a>
        HTML
        : '<a href="/login.php">Login</a>';

    echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    {$meta}
    <title>{$title} | Shingeki Vulnerable Lab</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; }
        nav a { margin-right: 1rem; }
        .warn { background: #fff3cd; border: 1px solid #ffecb5; padding: 1rem; border-radius: 8px; }
        pre { background: #111; color: #0f0; padding: 1rem; overflow-x: auto; }
        form { display: grid; gap: 0.75rem; max-width: 420px; }
        input, button, textarea { padding: 0.5rem; }
    </style>
</head>
<body>
    <p class="warn"><strong>Lab app:</strong> intentional vulnerabilities for DAST testing only.</p>
    <nav>
        <a href="/">Home</a>
        {$authLinks}
        <a href="/search.php">Search</a>
        <a href="/browse/welcome.txt">Browse files</a>
    </nav>
    <h1>{$title}</h1>
HTML;
}

function renderFooter(): void
{
    echo '</body></html>';
}
