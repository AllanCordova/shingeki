<?php

declare(strict_types=1);

require_once __DIR__.'/../../includes/layout.php';
require_once __DIR__.'/../../includes/auth.php';

requireAuth();

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$prefix = '/app/browse/';
$file = str_starts_with($uriPath, $prefix)
    ? substr($uriPath, strlen($prefix))
    : 'welcome.txt';

$storageDir = realpath(__DIR__.'/../../storage') ?: (__DIR__.'/../../storage');
$target = $storageDir.DIRECTORY_SEPARATOR.$file;

renderHeader('Secure files');

if (! is_file($target)) {
    http_response_code(404);
    echo '<p>File not found.</p>';
    renderFooter();
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
readfile($target);
exit;
