<?php

declare(strict_types=1);

$dbPath = '/var/www/data/app.sqlite';

function db(): PDO
{
    global $dbPath;

    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $pdo = new PDO('sqlite:'.$dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    return $pdo;
}
