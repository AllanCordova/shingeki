<?php

declare(strict_types=1);

$dbPath = '/var/www/data/app.sqlite';

if (! is_dir(dirname($dbPath))) {
    mkdir(dirname($dbPath), 0775, true);
}

$pdo = new PDO('sqlite:'.$dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$pdo->exec(
    'CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        password TEXT NOT NULL
    )'
);

$count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();

if ($count === 0) {
    $stmt = $pdo->prepare('INSERT INTO users (email, password) VALUES (?, ?)');
    $stmt->execute(['admin@vuln.local', 'super-secret']);
    $stmt->execute(['guest@vuln.local', 'guest123']);
}

echo "Vulnerable target database ready.\n";
