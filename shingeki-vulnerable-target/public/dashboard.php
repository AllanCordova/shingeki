<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/layout.php';
require_once __DIR__.'/../includes/auth.php';

$user = requireAuth();

renderHeader('Dashboard');

echo '<p>Signed in as <strong>'.htmlspecialchars((string) $user['email'], ENT_QUOTES).'</strong>.</p>';
echo '<p>Protected routes for authenticated DAST scans:</p>';
echo <<<'HTML'
<ul>
    <li><a href="/profile.php">Profile</a> — update email (SQL injection on <code>email</code> field)</li>
    <li><a href="/notes.php">Notes</a> — search notes (XSS on <code>q</code>)</li>
    <li><a href="/app/browse/welcome.txt">Secure files</a> — path traversal under <code>/app/browse/</code></li>
</ul>
HTML;

if (! empty($user['bio'])) {
    echo '<p>Bio: '.htmlspecialchars((string) $user['bio'], ENT_QUOTES).'</p>';
}

renderFooter();
