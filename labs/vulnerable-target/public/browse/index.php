<?php

declare(strict_types=1);

// public/ is the Apache docroot; includes/ and storage/ live one level above it.
$labRoot = dirname(__DIR__, 2);

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$uriPath = rawurldecode($uriPath);
$prefix = '/browse/';
$file = str_starts_with($uriPath, $prefix)
    ? substr($uriPath, strlen($prefix))
    : 'welcome.txt';
$file = str_replace('\\', '/', $file);
$file = ltrim($file, '/');
if ($file === '') {
    $file = 'welcome.txt';
}

$storageDir = $labRoot.'/storage';
$target = $storageDir.'/'.$file;

if (! is_file($target)) {
    require_once $labRoot.'/includes/layout.php';
    http_response_code(404);
    renderHeader('Browse files');
    echo '<p>File not found.</p>';
    renderFooter();
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
readfile($target);
exit;
