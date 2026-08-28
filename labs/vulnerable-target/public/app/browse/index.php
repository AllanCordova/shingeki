<?php

declare(strict_types=1);

// public/app/browse is three levels below includes/ and storage/.
$labRoot = dirname(__DIR__, 3);

require_once $labRoot.'/includes/layout.php';
require_once $labRoot.'/includes/auth.php';

requireAuth();

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$uriPath = rawurldecode($uriPath);
$prefix = '/app/browse/';
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
    http_response_code(404);
    renderHeader('Secure files');
    echo '<p>File not found.</p>';
    renderFooter();
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
readfile($target);
exit;
