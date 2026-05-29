<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/layout.php';

renderHeader('Home');

echo <<<'HTML'
<p>Use this application to validate the Shingeki DAST pipeline.</p>
<ul>
    <li><strong>SQL injection</strong> — <code>POST /login.php</code> form field <code>email</code></li>
    <li><strong>XSS</strong> — <code>GET /search.php?q=</code> reflected without encoding</li>
    <li><strong>Path traversal</strong> — <code>GET /browse/{file}</code> reads from storage without sanitization</li>
</ul>
HTML;

renderFooter();
