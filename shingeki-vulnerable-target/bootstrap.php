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
        password TEXT NOT NULL,
        bio TEXT
    )'
);

$pdo->exec(
    'CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        body TEXT NOT NULL
    )'
);

$columns = $pdo->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_ASSOC);
$hasBio = false;
foreach ($columns as $column) {
    if (($column['name'] ?? '') === 'bio') {
        $hasBio = true;
        break;
    }
}

if (! $hasBio) {
    $pdo->exec('ALTER TABLE users ADD COLUMN bio TEXT');
}

$count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();

if ($count === 0) {
    $stmt = $pdo->prepare('INSERT INTO users (email, password, bio) VALUES (?, ?, ?)');
    $stmt->execute(['admin@vuln.local', 'super-secret', 'Administrator account']);
    $stmt->execute(['guest@vuln.local', 'guest123', 'Guest lab account']);
}

$notesCount = (int) $pdo->query('SELECT COUNT(*) FROM notes')->fetchColumn();

if ($notesCount === 0) {
    $users = $pdo->query('SELECT id, email FROM users')->fetchAll(PDO::FETCH_ASSOC);
    $insert = $pdo->prepare('INSERT INTO notes (user_id, body) VALUES (?, ?)');

    foreach ($users as $user) {
        $insert->execute([(int) $user['id'], 'Welcome note for '.$user['email']]);
        $insert->execute([(int) $user['id'], 'Remember to rotate credentials after the DAST scan.']);
    }
}

echo "Vulnerable target database ready.\n";
