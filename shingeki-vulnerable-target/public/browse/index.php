<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/layout.php';

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$prefix = '/browse/';
$file = str_starts_with($uriPath, $prefix)
    ? substr($uriPath, strlen($prefix))
    : 'welcome.txt';

$storageDir = realpath(__DIR__.'/../storage') ?: (__DIR__.'/../storage');
$target = $storageDir.DIRECTORY_SEPARATOR.$file;

renderHeader('Browse files');

if (! is_file($target)) {
    http_response_code(404);
    echo '<p>File not found.</p>';
    renderFooter();
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
readfile($target);
exit;
