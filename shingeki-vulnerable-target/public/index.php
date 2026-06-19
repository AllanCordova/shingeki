<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/layout.php';

renderHeader('Home');

echo <<<'HTML'
<p>Use this application to validate the Shingeki DAST pipeline.</p>
<h2>Public routes</h2>
<ul>
    <li><strong>SQL injection</strong> — <code>POST /login.php</code> form field <code>email</code></li>
    <li><strong>XSS</strong> — <code>GET /search.php?q=</code> reflected without encoding</li>
    <li><strong>Path traversal</strong> — <code>GET /browse/{file}</code> reads from storage without sanitization</li>
</ul>
<h2>Authenticated routes</h2>
<p>Sign in first (session cookie). Use <strong>Conectar ao alvo</strong> in Shingeki to import the cookie for authenticated scans.</p>
<ul>
    <li><a href="/dashboard.php">Dashboard</a> — session-protected landing page</li>
    <li><strong>SQL injection</strong> — <code>POST /profile.php</code> field <code>email</code> (requires login)</li>
    <li><strong>XSS</strong> — <code>GET /notes.php?q=</code> reflected without encoding (requires login)</li>
    <li><strong>Path traversal</strong> — <code>GET /app/browse/{file}</code> (requires login)</li>
</ul>
HTML;

renderFooter();
